"""
Router: /characters
Gestión de personajes WoW del usuario autenticado.
"""

import httpx
import os
import uuid as _uuid
import shutil
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.character import Character, CharacterRace
from app.models.character_title import CharacterTitle
from app.models.character_relation import CharacterRelation
from app.models.title import Title
from app.models.enums import CharacterClass
from app.models.achievement import Achievement
from app.models.user_achievement import UserAchievement
from app.models.relation_claim import RelationClaim
from app.schemas.character import (
    CharacterAddInput, CharacterResponse, BlizzardCharacterOut,
    SetMainInput, FavoriteTitleInput, TitleOut,
    CharacterBioUpdate, RelationCreate, RelationOut, RelationCharacterOut,
    AchievementOut, merge_public_fields,
)
from app.services import blizzard, title_sync
from app.models.craft import CharacterProfessionSkill, CraftOrder
from app.services.professions import store_profession_snapshot, summarize_profession
from app.services.bio_questions import answers_complete, normalize_answers
from app.services.character_images import media_type_for, upload_file
from app.urls import static_url

BLIZZARD_REGION = os.getenv("BLIZZARD_REGION", "eu")
BLIZZARD_CLIENT_ID = os.getenv("BLIZZARD_CLIENT_ID")
BLIZZARD_CLIENT_SECRET = os.getenv("BLIZZARD_CLIENT_SECRET")

UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB

BLIZZARD_CLASS_MAP: dict[int, str] = {
    1: "WARRIOR", 2: "PALADIN", 3: "HUNTER", 4: "ROGUE", 5: "PRIEST",
    6: "DEATH_KNIGHT", 7: "SHAMAN", 8: "MAGE", 9: "WARLOCK", 10: "MONK",
    11: "DRUID", 12: "DEMONHUNTER", 13: "EVOKER",
}

BLIZZARD_RACE_MAP: dict[int, str] = {
    1: "HUMAN", 2: "ORC", 3: "DWARF", 4: "NIGHT_ELF", 5: "UNDEAD",
    6: "TAUREN", 7: "GNOME", 8: "TROLL", 9: "GOBLIN", 10: "BLOOD_ELF",
    11: "DRAENEI", 22: "WORGEN", 24: "PANDAREN", 25: "PANDAREN", 26: "PANDAREN",
    27: "NIGHTBORNE", 28: "HIGHMOUNTAIN_TAUREN", 29: "VOID_ELF",
    30: "LIGHTFORGED", 31: "ZANDALARI", 32: "KUL_TIRAN",
    34: "DARK_IRON_DWARF", 35: "VULPERA", 36: "MAGHAR_ORC",
    37: "MECHAGNOME", 52: "DRACTHYR", 70: "DRACTHYR",
}

router = APIRouter(prefix="/characters", tags=["characters"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_own_character(
    name: str, realm: str, user: User, db: Session
) -> Character:
    char = (
        db.query(Character)
        .filter(
            Character.user_id == user.id,
            Character.name == name,
            Character.realm == realm,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not char:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")
    return char


# ── Mis personajes ─────────────────────────────────────────────────────────────

@router.get("/my", response_model=list[CharacterResponse])
def get_my_characters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Character)
        .filter(Character.user_id == current_user.id, Character.deleted_at.is_(None))
        .order_by(Character.is_main.desc(), Character.name)
        .all()
    )


# ── Personajes de Blizzard ─────────────────────────────────────────────────────

@router.get("/blizzard", response_model=list[BlizzardCharacterOut])
async def get_blizzard_characters(
    current_user: User = Depends(get_current_user),
):
    if not current_user.blizzard_access_token:
        raise HTTPException(400, "No tienes Battle.net vinculado.")

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/user/wow",
            headers={"Authorization": f"Bearer {current_user.blizzard_access_token}"},
            params={"namespace": f"profile-{BLIZZARD_REGION}", "locale": "es_ES"},
        )

    if res.status_code == 401:
        raise HTTPException(401, "Tu token de Battle.net ha caducado. Reconecta tu cuenta.")
    if res.status_code != 200:
        raise HTTPException(400, f"Error al obtener personajes de Battle.net ({res.status_code})")

    characters: list[BlizzardCharacterOut] = []
    for account in res.json().get("wow_accounts", []):
        for char in account.get("characters", []):
            characters.append(BlizzardCharacterOut(
                name=char["name"],
                realm=char["realm"]["slug"],
                realm_name=char["realm"]["name"],
                class_id=char["playable_class"]["id"],
                race_id=char["playable_race"]["id"],
                class_name=char["playable_class"]["name"],
                race_name=char["playable_race"]["name"],
                level=char["level"],
                faction=char["faction"]["type"],
                gender=(char.get("gender") or {}).get("type"),
                blizzard_character_id=char["id"],
            ))

    characters.sort(key=lambda c: (c.realm != "dun-modr", -c.level))
    return characters


# ── Búsqueda de personajes del gremio (para relaciones) ───────────────────────

@router.get("/search")
def search_characters(
    q: str = Query(default="", min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Busca personajes por nombre en toda la hermandad (para añadir relaciones)."""
    from app.models.user import User as UserModel
    results = (
        db.query(Character, UserModel.username)
        .join(UserModel, UserModel.id == Character.user_id)
        .filter(
            Character.name.ilike(f"%{q}%"),
            Character.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    )
    return [
        {
            "name":           c.name,
            "realm":          c.realm,
            "wow_class":      c.wow_class.value if c.wow_class else None,
            "owner_username": username,
            "is_own":         c.user_id == current_user.id,
        }
        for c, username in results
    ]


# ── Establecer main ────────────────────────────────────────────────────────────

@router.patch("/set-main", response_model=CharacterResponse)
def set_main_character(
    data: SetMainInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Character).filter(
        Character.user_id == current_user.id
    ).update({"is_main": False, "is_alt": True})

    char = _get_own_character(data.name, data.realm, current_user, db)
    char.is_main = True
    char.is_alt = False
    db.commit()
    db.refresh(char)
    return char


# ── Título favorito ────────────────────────────────────────────────────────────

@router.get("/{name}/{realm}/titles", response_model=list[TitleOut])
def get_character_titles(
    name: str, realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = _get_own_character(name, realm, current_user, db)
    return (
        db.query(Title)
        .join(CharacterTitle, CharacterTitle.title_id == Title.id)
        .filter(CharacterTitle.character_id == char.id, Title.is_active == True)
        .order_by(Title.name)
        .all()
    )


@router.post("/{name}/{realm}/sync-titles")
async def sync_character_titles(
    name: str, realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Importa los títulos del catálogo que el personaje ya tiene desbloqueados en el juego."""
    char = _get_own_character(name, realm, current_user, db)
    if char.game != "retail":
        raise HTTPException(400, "Solo los personajes Retail tienen títulos en el juego")
    try:
        granted = await title_sync.sync_character(db, char)
    except blizzard.BlizzardError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"granted": granted}


@router.post("/{name}/{realm}/verify")
async def verify_character(
    name: str, realm: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Comprueba en el roster de Battle.net que el personaje es del usuario y lo marca como verificado."""
    char = _get_own_character(name, realm, current_user, db)
    if char.game != "retail":
        raise HTTPException(400, "Solo los personajes Retail se verifican con Battle.net")
    if char.is_verified:
        return {"is_verified": True}
    if not _has_valid_blizzard_token(current_user):
        raise HTTPException(
            409, "Tu sesión de Battle.net ha caducado. Vuelve a vincular tu cuenta para verificar el personaje."
        )

    async with httpx.AsyncClient() as client:
        checked, entry = await _find_in_user_roster(
            client, current_user.blizzard_access_token, char.name, char.realm
        )
    if not checked:
        raise HTTPException(502, "No se ha podido consultar Battle.net. Inténtalo de nuevo en unos minutos.")
    if entry is None:
        raise HTTPException(403, "Este personaje no pertenece a tu cuenta de Battle.net")

    char.is_verified = True
    char.blizzard_character_id = entry["id"]
    db.commit()
    background_tasks.add_task(title_sync.sync_character_in_background, char.id)
    return {"is_verified": True}


@router.patch("/{name}/{realm}/favorite-title", response_model=CharacterResponse)
def set_favorite_title(
    name: str, realm: str,
    data: FavoriteTitleInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = _get_own_character(name, realm, current_user, db)
    if data.title_id is None:
        char.favorite_title_id = None
    else:
        has_title = db.query(CharacterTitle).filter(
            CharacterTitle.character_id == char.id,
            CharacterTitle.title_id == data.title_id,
        ).first()
        if not has_title:
            raise HTTPException(400, "Este personaje no tiene ese título")
        title = db.query(Title).filter(Title.id == data.title_id, Title.is_active == True).first()
        if not title:
            raise HTTPException(400, "Ese título no está disponible")
        if title.slot == "prefix":
            raise HTTPException(400, "Ese es un antetítulo; elígelo en Antetítulos")
        char.favorite_title_id = data.title_id

    db.commit()
    db.refresh(char)
    return char


@router.patch("/{name}/{realm}/favorite-prefix", response_model=CharacterResponse)
def set_favorite_prefix(
    name: str, realm: str,
    data: FavoriteTitleInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = _get_own_character(name, realm, current_user, db)
    if data.title_id is None:
        char.favorite_prefix_id = None
        char.prefix_title = None
    else:
        title = db.query(Title).filter(Title.id == data.title_id, Title.is_active == True).first()
        if not title or title.slot != "prefix":
            raise HTTPException(400, "Ese no es un antetítulo")
        has_title = db.query(CharacterTitle).filter(
            CharacterTitle.character_id == char.id,
            CharacterTitle.title_id == data.title_id,
        ).first()
        if not has_title:
            raise HTTPException(400, "Este personaje no tiene ese antetítulo")
        char.favorite_prefix_id = data.title_id
        char.prefix_title = title.name

    db.commit()
    db.refresh(char)
    return char


# ── Lore / trasfondo ───────────────────────────────────────────────────────────

@router.patch("/{name}/{realm}/bio", response_model=CharacterResponse)
def update_bio(
    name: str, realm: str,
    data: CharacterBioUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualiza identidad, datos de ficha, borrador de lore y el cuestionario."""
    char = _get_own_character(name, realm, current_user, db)

    if data.surname is not None:
        new_surname = (data.surname or "").strip() or None
        old_surname = (char.surname or "").strip() or None
        if new_surname != old_surname:
            char.surname = new_surname
            char.surname_allowed = False if new_surname else True
    if data.origin       is not None: char.origin       = data.origin       or None
    if data.age_lore     is not None: char.age_lore     = data.age_lore
    if data.residence    is not None: char.residence    = data.residence    or None
    if data.public_fields is not None:
        char.public_fields = merge_public_fields(data.public_fields)
    if char.bio_answers_pending and (
        data.biography is not None or data.personality is not None or data.appearance is not None
    ):
        raise HTTPException(
            409,
            "El Eremita todavía tiene esta ficha. Espera su respuesta para cambiar el texto.",
        )
    if data.biography is not None:
        bio = data.biography.strip()
        if char.bio_status == "published" and len(bio) < 40:
            raise HTTPException(400, "La biografía es demasiado corta")
        char.biography = bio or None
    if data.personality is not None:
        char.personality = data.personality.strip() or None
    if data.appearance is not None:
        char.appearance = data.appearance.strip() or None
    if data.bio_answers is not None:
        if char.bio_answers_pending:
            raise HTTPException(
                409,
                "El Eremita todavía tiene este cuestionario. Espera su respuesta para cambiar las respuestas.",
            )
        char.bio_answers = normalize_answers(data.bio_answers)
        char.bio_rejection_reason = None

    db.commit()
    db.refresh(char)
    return char


@router.post("/{name}/{realm}/bio/submit", response_model=CharacterResponse)
def submit_bio(
    name: str, realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = _get_own_character(name, realm, current_user, db)
    if char.bio_answers_pending:
        raise HTTPException(409, "Este cuestionario ya está en revisión")
    answers = normalize_answers(char.bio_answers)
    has_sheet = len((char.biography or "").strip()) >= 40
    if not answers_complete(answers) and not has_sheet:
        raise HTTPException(400, "Escribe la biografía en el pergamino antes de publicarla")
    char.bio_answers = answers
    char.bio_answers_pending = True
    char.bio_submitted_at = datetime.now(timezone.utc)
    char.bio_rejection_reason = None
    if char.bio_status != "published":
        char.bio_status = "pending"
    db.commit()
    db.refresh(char)
    return char


# ── Relaciones entre personajes ────────────────────────────────────────────────

@router.get("/{name}/{realm}/relations", response_model=list[RelationOut])
def get_relations(
    name: str, realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve todas las relaciones de un personaje (salientes e entrantes)."""
    char = _get_own_character(name, realm, current_user, db)
    from app.models.user import User as UserModel

    # Salientes: from = este personaje
    outgoing = (
        db.query(CharacterRelation, Character, UserModel.username)
        .join(Character, Character.id == CharacterRelation.to_character_id)
        .join(UserModel, UserModel.id == Character.user_id)
        .filter(CharacterRelation.from_character_id == char.id)
        .all()
    )

    # Entrantes: to = este personaje
    incoming = (
        db.query(CharacterRelation, Character, UserModel.username)
        .join(Character, Character.id == CharacterRelation.from_character_id)
        .join(UserModel, UserModel.id == Character.user_id)
        .filter(CharacterRelation.to_character_id == char.id)
        .all()
    )

    story_counts = dict(
        db.query(RelationClaim.to_character_id, sa_func.count(RelationClaim.id))
        .filter(
            RelationClaim.from_character_id == char.id,
            RelationClaim.status == "confirmed",
        )
        .group_by(RelationClaim.to_character_id)
        .all()
    )
    incoming_counts = dict(
        db.query(RelationClaim.from_character_id, sa_func.count(RelationClaim.id))
        .filter(
            RelationClaim.to_character_id == char.id,
            RelationClaim.status == "confirmed",
        )
        .group_by(RelationClaim.from_character_id)
        .all()
    )
    outgoing_keys = {(rel.to_character_id, rel.relation_type) for rel, _, _ in outgoing}
    incoming_keys = {(rel.from_character_id, rel.relation_type) for rel, _, _ in incoming}

    result = []
    for rel, other_char, owner_username in outgoing:
        result.append(RelationOut(
            id=rel.id,
            relation_type=rel.relation_type,
            description=rel.description,
            direction="outgoing",
            other=RelationCharacterOut(
                name=other_char.name,
                realm=other_char.realm,
                wow_class=other_char.wow_class.value if other_char.wow_class else None,
                owner_username=owner_username,
            ),
            story_count=int(story_counts.get(other_char.id, 0) + incoming_counts.get(other_char.id, 0)),
            reciprocal=(other_char.id, rel.relation_type) in incoming_keys,
        ))
    for rel, other_char, owner_username in incoming:
        result.append(RelationOut(
            id=rel.id,
            relation_type=rel.relation_type,
            description=rel.description,
            direction="incoming",
            other=RelationCharacterOut(
                name=other_char.name,
                realm=other_char.realm,
                wow_class=other_char.wow_class.value if other_char.wow_class else None,
                owner_username=owner_username,
            ),
            story_count=int(story_counts.get(other_char.id, 0) + incoming_counts.get(other_char.id, 0)),
            reciprocal=(other_char.id, rel.relation_type) in outgoing_keys,
        ))
    return result


@router.get("/{name}/{realm}/achievements", response_model=list[AchievementOut])
def list_character_achievements(
    name: str, realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = _get_own_character(name, realm, current_user, db)
    rows = (
        db.query(UserAchievement, Achievement)
        .join(Achievement, Achievement.id == UserAchievement.achievement_id)
        .filter(UserAchievement.user_id == current_user.id)
        .order_by(UserAchievement.earned_at.desc())
        .all()
    )
    items: list[AchievementOut] = []
    for earned, ach in rows:
        if ach.account_wide:
            scope = "account"
        elif earned.character_id == char.id:
            scope = "character"
        else:
            continue
        items.append(AchievementOut(
            id=ach.id,
            name=ach.name,
            title=ach.achievement_title,
            description=ach.achievement_description,
            icon=ach.achievement_icon,
            points_value=ach.points_value,
            scope=scope,
            earned_at=earned.earned_at,
        ))
    return items


@router.post("/{name}/{realm}/relations", response_model=RelationOut, status_code=201)
def add_relation(
    name: str, realm: str,
    data: RelationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea una relación desde este personaje hacia otro del gremio."""
    from app.models.character_relation import RELATION_TYPES
    from app.models.user import User as UserModel

    char = _get_own_character(name, realm, current_user, db)

    if data.relation_type not in RELATION_TYPES:
        raise HTTPException(400, f"Tipo de relación no válido: {data.relation_type}")

    target = (
        db.query(Character)
        .filter(
            Character.name == data.to_name,
            Character.realm == data.to_realm,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not target:
        raise HTTPException(404, f"Personaje {data.to_name}-{data.to_realm} no encontrado")
    if target.id == char.id:
        raise HTTPException(400, "Un personaje no puede relacionarse consigo mismo")

    existing = db.query(CharacterRelation).filter(
        CharacterRelation.from_character_id == char.id,
        CharacterRelation.to_character_id == target.id,
        CharacterRelation.relation_type == data.relation_type,
    ).first()
    if existing:
        raise HTTPException(400, "Esta relación ya existe")

    import uuid as _uuid
    rel = CharacterRelation(
        id=_uuid.uuid4(),
        from_character_id=char.id,
        to_character_id=target.id,
        relation_type=data.relation_type,
        description=data.description,
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)

    target_owner = db.query(UserModel).filter(UserModel.id == target.user_id).first()
    return RelationOut(
        id=rel.id,
        relation_type=rel.relation_type,
        description=rel.description,
        direction="outgoing",
        other=RelationCharacterOut(
            name=target.name,
            realm=target.realm,
            wow_class=target.wow_class.value if target.wow_class else None,
            owner_username=target_owner.username if target_owner else "?",
        ),
    )


@router.delete("/{name}/{realm}/relations/{relation_id}", status_code=204)
def delete_relation(
    name: str, realm: str, relation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elimina una relación. Solo puede hacerlo el dueño del personaje origen."""
    import uuid as _uuid
    char = _get_own_character(name, realm, current_user, db)

    rel = db.query(CharacterRelation).filter(
        CharacterRelation.id == _uuid.UUID(relation_id),
        CharacterRelation.from_character_id == char.id,
    ).first()
    if not rel:
        raise HTTPException(404, "Relación no encontrada")

    db.delete(rel)
    db.commit()


# ── Añadir personaje ───────────────────────────────────────────────────────────

@router.post("/add", response_model=CharacterResponse, status_code=201)
async def add_character(
    data: CharacterAddInput,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Para Forever el apellido es obligatorio
    if data.game == "forever" and not (data.surname or "").strip():
        raise HTTPException(400, "Los personajes de Warcraft Forever requieren apellido.")

    existing = (
        db.query(Character)
        .filter(
            Character.user_id == current_user.id,
            Character.name == data.name,
            Character.realm == data.realm,
            Character.game == data.game,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if existing:
        raise HTTPException(400, "Este personaje ya está registrado en esta línea temporal")

    wow_class_str = BLIZZARD_CLASS_MAP.get(data.class_id) if data.class_id else None
    wow_class = CharacterClass[wow_class_str] if wow_class_str else None

    race_str = BLIZZARD_RACE_MAP.get(data.race_id) if data.race_id else None
    race = CharacterRace[race_str] if race_str else None

    if data.is_main:
        db.query(Character).filter(
            Character.user_id == current_user.id
        ).update({"is_main": False, "is_alt": True})

    # Obtener render + cara del Character Media API si es Retail y hay token
    render_url = None
    face_url = None
    is_verified = data.game != "retail"
    blizzard_character_id = data.blizzard_character_id
    if data.game == "retail" and current_user.blizzard_access_token:
        async with httpx.AsyncClient() as client:
            roster_checked, roster_entry = await _find_in_user_roster(
                client, current_user.blizzard_access_token, data.name, data.realm
            )
            if roster_checked and roster_entry is None:
                raise HTTPException(403, "Este personaje no pertenece a tu cuenta de Battle.net")
            if roster_entry is not None:
                is_verified = True
                blizzard_character_id = roster_entry["id"]

            media = await _fetch_character_media(
                client, data.name, data.realm, current_user.blizzard_access_token
            )
            render_url = media.get("render_url")
            face_url = media.get("face_url")

    char = Character(
        user_id=current_user.id,
        game=data.game,
        name=data.name,
        realm=data.realm,
        surname=(data.surname or "").strip() or None,
        surname_allowed=not bool((data.surname or "").strip()),
        blizzard_character_id=blizzard_character_id,
        render_url=render_url,
        face_url=face_url,
        wow_class=wow_class,
        race=race,
        level=data.level,
        faction=data.faction,
        gender=data.gender,
        is_main=data.is_main,
        is_alt=not data.is_main,
        is_verified=is_verified,
    )
    db.add(char)
    db.commit()
    db.refresh(char)

    if char.game == "retail":
        background_tasks.add_task(title_sync.sync_character_in_background, char.id)
    return char


# ── Soft-delete ────────────────────────────────────────────────────────────────

async def _blizzard_client_token(client: httpx.AsyncClient) -> str | None:
    if not BLIZZARD_CLIENT_ID or not BLIZZARD_CLIENT_SECRET:
        return None
    try:
        res = await client.post(
            "https://oauth.battle.net/token",
            data={"grant_type": "client_credentials"},
            auth=(BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET),
            timeout=8.0,
        )
        if res.status_code != 200:
            return None
        return res.json().get("access_token")
    except Exception:
        return None


def _identity_from_blizzard(class_id: int | None, race_id: int | None):
    wow_class = None
    race = None
    cls_name = BLIZZARD_CLASS_MAP.get(class_id) if class_id else None
    if cls_name:
        wow_class = CharacterClass[cls_name]
    race_name = BLIZZARD_RACE_MAP.get(race_id) if race_id else None
    if race_name:
        race = CharacterRace[race_name]
    return wow_class, race


def _apply_blizzard_identity(char: Character, info: dict) -> bool:
    changed = False
    blizzard_id = info.get("id")
    if blizzard_id and not char.blizzard_character_id:
        char.blizzard_character_id = blizzard_id
        changed = True
    wow_class, race = _identity_from_blizzard(info.get("class_id"), info.get("race_id"))
    if wow_class and char.wow_class != wow_class:
        char.wow_class = wow_class
        changed = True
    if race and char.race != race:
        char.race = race
        changed = True
    faction = info.get("faction")
    if faction and char.faction != faction:
        char.faction = faction
        changed = True
    gender = info.get("gender")
    if gender and char.gender != gender:
        char.gender = gender
        changed = True
    return changed


def _is_low_quality_render(url: str | None) -> bool:
    """True si falta render o solo hay la miniatura -avatar.jpg de Blizzard."""
    if not url:
        return True
    return url.rstrip("/").endswith("-avatar.jpg")


def _has_valid_blizzard_token(user: User) -> bool:
    if not user.blizzard_access_token:
        return False
    expires = user.blizzard_token_expires_at
    if expires is None:
        return True
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires > datetime.now(timezone.utc)


async def _find_in_user_roster(
    client: httpx.AsyncClient,
    access_token: str,
    name: str,
    realm: str,
) -> tuple[bool, dict | None]:
    """
    Busca el personaje en la cuenta de Battle.net del usuario.
    Devuelve (comprobado, entrada); comprobado=False si Blizzard no pudo responder.
    """
    try:
        res = await client.get(
            f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/user/wow",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"namespace": f"profile-{BLIZZARD_REGION}", "locale": "es_ES"},
            timeout=8.0,
        )
    except httpx.HTTPError:
        return False, None
    if res.status_code != 200:
        return False, None

    wanted = (name.lower(), blizzard.realm_slug(realm))
    for account in res.json().get("wow_accounts", []):
        for char in account.get("characters", []):
            if (char["name"].lower(), char["realm"]["slug"].lower()) == wanted:
                return True, char
    return True, None


async def _fetch_character_media(
    client: httpx.AsyncClient,
    name: str,
    realm: str,
    access_token: str,
) -> dict[str, str | None]:
    """
    Character Media API: cuerpo entero (render) + cara (face).
    Render: main / main-raw > inset. Cara: avatar > inset.
    """
    out: dict[str, str | None] = {"render_url": None, "face_url": None}
    try:
        res = await client.get(
            f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/wow/character/{realm}/{name.lower()}/character-media",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"namespace": f"profile-{BLIZZARD_REGION}", "locale": "es_ES"},
            timeout=8.0,
        )
        if res.status_code != 200:
            return out
        by_key = {
            a.get("key"): a.get("value")
            for a in res.json().get("assets", [])
            if a.get("key") and a.get("value")
        }
        for preferred in ("main", "main-raw", "inset"):
            if by_key.get(preferred):
                out["render_url"] = by_key[preferred]
                break
        for preferred in ("avatar", "inset"):
            if by_key.get(preferred):
                out["face_url"] = by_key[preferred]
                break
    except Exception:
        pass
    return out


async def _fetch_character_render_url(
    client: httpx.AsyncClient,
    name: str,
    realm: str,
    access_token: str,
) -> str | None:
    """Compat: solo la URL de cuerpo entero."""
    media = await _fetch_character_media(client, name, realm, access_token)
    return media.get("render_url") or media.get("face_url")


async def _fetch_character_identity(
    client: httpx.AsyncClient,
    name: str,
    realm: str,
    access_token: str,
) -> dict | None:
    """Datos públicos de identidad (clase, raza, facción) desde la armería."""
    try:
        res = await client.get(
            f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/wow/character/{realm}/{name.lower()}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"namespace": f"profile-{BLIZZARD_REGION}", "locale": "es_ES"},
            timeout=8.0,
        )
        if res.status_code != 200:
            return None
        data = res.json()
        race = data.get("playable_race") or data.get("race") or {}
        return {
            "id": data.get("id"),
            "class_id": (data.get("character_class") or {}).get("id"),
            "race_id": race.get("id"),
            "faction": (data.get("faction") or {}).get("type"),
            "gender": (data.get("gender") or {}).get("type"),
        }
    except Exception:
        return None


@router.post("/sync-blizzard-ids", status_code=200)
async def sync_blizzard_ids(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Actualiza id de Blizzard, render, clase, raza y facción de los Retail del usuario.
    Usa el roster de la cuenta si hay token; la identidad también se rellena
    desde la armería pública (client credentials) si falta.
    """
    user_token = current_user.blizzard_access_token
    client_token: str | None = None

    async with httpx.AsyncClient() as client:
        bnet_index: dict[tuple[str, str], dict] = {}
        if user_token:
            res = await client.get(
                f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/user/wow",
                headers={"Authorization": f"Bearer {user_token}"},
                params={"namespace": f"profile-{BLIZZARD_REGION}", "locale": "es_ES"},
            )
            if res.status_code == 200:
                for account in res.json().get("wow_accounts", []):
                    for bnet_char in account.get("characters", []):
                        key = (bnet_char["name"].lower(), bnet_char["realm"]["slug"].lower())
                        bnet_index[key] = {
                            "id": bnet_char["id"],
                            "class_id": (bnet_char.get("playable_class") or {}).get("id"),
                            "race_id": (bnet_char.get("playable_race") or {}).get("id"),
                            "faction": (bnet_char.get("faction") or {}).get("type"),
                            "gender": (bnet_char.get("gender") or {}).get("type"),
                        }
            else:
                user_token = None

        chars_to_sync = (
            db.query(Character)
            .filter(
                Character.user_id == current_user.id,
                Character.game == "retail",
                Character.deleted_at.is_(None),
            )
            .all()
        )

        synced = 0
        for char in chars_to_sync:
            key = (char.name.lower(), char.realm.lower())
            info = bnet_index.get(key)
            needs_identity = not char.race or not char.faction or not char.wow_class or not char.gender
            if needs_identity and (info is None or not info.get("gender")):
                token = user_token
                if not token:
                    if client_token is None:
                        client_token = await _blizzard_client_token(client)
                    token = client_token
                if token:
                    extra = await _fetch_character_identity(
                        client, char.name, char.realm, token
                    )
                    if extra:
                        info = {**(info or {}), **{k: v for k, v in extra.items() if v}}

            changed = False
            if info:
                changed = _apply_blizzard_identity(char, info)

            needs_media = _is_low_quality_render(char.render_url) or not char.face_url
            if needs_media:
                media_token = user_token
                if not media_token:
                    if client_token is None:
                        client_token = await _blizzard_client_token(client)
                    media_token = client_token
                if media_token:
                    media = await _fetch_character_media(
                        client, char.name, char.realm, media_token
                    )
                    render = media.get("render_url")
                    face = media.get("face_url")
                    if render and render != char.render_url and (
                        _is_low_quality_render(char.render_url) or not char.render_url
                    ):
                        char.render_url = render
                        changed = True
                    if face and face != char.face_url:
                        char.face_url = face
                        changed = True
                    elif (
                        not char.face_url
                        and char.render_url
                        and char.render_url.rstrip("/").endswith("-avatar.jpg")
                    ):
                        char.face_url = char.render_url
                        changed = True

            if changed:
                synced += 1

        if synced:
            db.commit()

    return {"synced": synced}



@router.get("/pending-avatars")
def list_pending_avatars(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: imágenes pendientes (completa y/o cara)."""
    from sqlalchemy import or_
    from app.models.user import User as UserModel
    results = (
        db.query(Character, UserModel.username)
        .join(UserModel, UserModel.id == Character.user_id)
        .filter(
            Character.deleted_at.is_(None),
            or_(
                Character.pending_avatar_url.isnot(None),
                Character.pending_face_url.isnot(None),
            ),
        )
        .all()
    )
    out = []
    for c, username in results:
        base = {
            "name": c.name,
            "realm": c.realm,
            "game": c.game,
            "owner_username": username,
        }
        if c.pending_avatar_url:
            out.append({
                **base,
                "kind": "full",
                "pending_avatar_url": static_url(c.pending_avatar_url),
            })
        if c.pending_face_url:
            out.append({
                **base,
                "kind": "face",
                "pending_avatar_url": static_url(c.pending_face_url),
            })
    return out


@router.get("/{name}/{realm}/pending-file")
def download_pending_image(
    name: str,
    realm: str,
    kind: str = "full",
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: descarga la imagen de perfil o de cara que subió el jugador."""
    if kind not in ("face", "full"):
        raise HTTPException(400, "kind debe ser face o full")
    char = db.query(Character).filter(
        Character.name == name,
        Character.realm == realm,
        Character.deleted_at.is_(None),
    ).first()
    if not char:
        raise HTTPException(404, "Personaje no encontrado")
    relative = char.pending_face_url if kind == "face" else char.pending_avatar_url
    if not relative:
        raise HTTPException(404, "No hay imagen pendiente para este personaje")
    path = upload_file(relative)
    safe = "".join(ch if ch.isalnum() else "-" for ch in char.name).strip("-") or "personaje"
    filename = f"{safe}-{kind}{path.suffix.lower()}"
    return FileResponse(
        path,
        media_type=media_type_for(path),
        filename=filename,
        content_disposition_type="attachment",
    )


@router.delete("/{name}/{realm}", status_code=204)
def delete_character(
    name: str, realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone
    char = _get_own_character(name, realm, current_user, db)
    char.deleted_at = datetime.now(timezone.utc)
    db.commit()


# ── Avatares ───────────────────────────────────────────────────────────────

async def _store_pending_image(
    char: Character,
    file: UploadFile,
    *,
    pending_attr: str,
    prefix: str,
) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Solo se permiten imágenes JPEG, PNG o WebP.")

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(400, "La imagen no puede superar 5 MB.")

    ext = (file.filename or "avatar").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    filename = f"{prefix}_{char.id}_{_uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename

    with filepath.open("wb") as f:
        f.write(content)

    previous = getattr(char, pending_attr)
    if previous:
        old = Path("uploads") / previous
        if old.exists():
            old.unlink(missing_ok=True)

    relative = f"avatars/{filename}"
    setattr(char, pending_attr, relative)
    return relative


@router.post("/{name}/{realm}/avatar", status_code=202)
async def upload_avatar(
    name: str, realm: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sube imagen completa (ficha/carrusel). Queda pendiente de aprobación."""
    char = _get_own_character(name, realm, current_user, db)
    await _store_pending_image(char, file, pending_attr="pending_avatar_url", prefix="full")
    db.commit()
    return {"message": "Imagen completa enviada. Un admin la revisará antes de publicarla."}


@router.post("/{name}/{realm}/avatar/approve", status_code=200)
def approve_avatar(
    name: str, realm: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: aprueba la imagen pendiente de un personaje."""
    char = db.query(Character).filter(
        Character.name == name,
        Character.realm == realm,
        Character.deleted_at.is_(None),
    ).first()
    if not char:
        raise HTTPException(404, "Personaje no encontrado")
    if not char.pending_avatar_url:
        raise HTTPException(400, "No hay imagen pendiente para este personaje")

    # Eliminar imagen custom anterior
    if char.custom_avatar_url:
        old = Path("uploads") / char.custom_avatar_url
        old.unlink(missing_ok=True)

    char.custom_avatar_url = char.pending_avatar_url
    char.pending_avatar_url = None
    db.commit()
    return {"message": "Imagen completa aprobada y publicada."}


@router.post("/{name}/{realm}/avatar/reject", status_code=200)
def reject_avatar(
    name: str, realm: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: rechaza la imagen completa pendiente."""
    char = db.query(Character).filter(
        Character.name == name,
        Character.realm == realm,
        Character.deleted_at.is_(None),
    ).first()
    if not char:
        raise HTTPException(404, "Personaje no encontrado")
    if not char.pending_avatar_url:
        raise HTTPException(400, "No hay imagen completa pendiente para este personaje")

    old = Path("uploads") / char.pending_avatar_url
    old.unlink(missing_ok=True)
    char.pending_avatar_url = None
    db.commit()
    return {"message": "Imagen completa rechazada y eliminada."}


@router.delete("/{name}/{realm}/avatar", status_code=204)
def remove_custom_avatar(
    name: str, realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancelar pendiente o quitar imagen completa custom."""
    char = _get_own_character(name, realm, current_user, db)

    if char.pending_avatar_url:
        Path("uploads/" + char.pending_avatar_url).unlink(missing_ok=True)
        char.pending_avatar_url = None
    if char.custom_avatar_url:
        Path("uploads/" + char.custom_avatar_url).unlink(missing_ok=True)
        char.custom_avatar_url = None

    db.commit()


# ── Cara (ranking) ─────────────────────────────────────────────────────────

@router.post("/{name}/{realm}/face", status_code=202)
async def upload_face(
    name: str, realm: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sube foto de cara (ranking). Queda pendiente de aprobación."""
    char = _get_own_character(name, realm, current_user, db)
    await _store_pending_image(char, file, pending_attr="pending_face_url", prefix="face")
    db.commit()
    return {"message": "Foto de cara enviada. Un admin la revisará antes de publicarla."}


@router.post("/{name}/{realm}/face/approve", status_code=200)
def approve_face(
    name: str, realm: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    char = db.query(Character).filter(
        Character.name == name,
        Character.realm == realm,
        Character.deleted_at.is_(None),
    ).first()
    if not char:
        raise HTTPException(404, "Personaje no encontrado")
    if not char.pending_face_url:
        raise HTTPException(400, "No hay foto de cara pendiente para este personaje")

    if char.custom_face_url:
        old = Path("uploads") / char.custom_face_url
        old.unlink(missing_ok=True)

    char.custom_face_url = char.pending_face_url
    char.pending_face_url = None
    db.commit()
    return {"message": "Foto de cara aprobada y publicada."}


@router.post("/{name}/{realm}/face/reject", status_code=200)
def reject_face(
    name: str, realm: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    char = db.query(Character).filter(
        Character.name == name,
        Character.realm == realm,
        Character.deleted_at.is_(None),
    ).first()
    if not char:
        raise HTTPException(404, "Personaje no encontrado")
    if not char.pending_face_url:
        raise HTTPException(400, "No hay foto de cara pendiente para este personaje")

    old = Path("uploads") / char.pending_face_url
    old.unlink(missing_ok=True)
    char.pending_face_url = None
    db.commit()
    return {"message": "Foto de cara rechazada y eliminada."}


@router.delete("/{name}/{realm}/face", status_code=204)
def remove_custom_face(
    name: str, realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = _get_own_character(name, realm, current_user, db)

    if char.pending_face_url:
        Path("uploads/" + char.pending_face_url).unlink(missing_ok=True)
        char.pending_face_url = None
    if char.custom_face_url:
        Path("uploads/" + char.custom_face_url).unlink(missing_ok=True)
        char.custom_face_url = None

    db.commit()


# ── Profesiones ────────────────────────────────────────────────────────────

def _completed_craft_orders(db: Session, char: Character) -> list[dict]:
    rows = (
        db.query(CraftOrder)
        .filter(
            CraftOrder.crafter_user_id == char.user_id,
            sa_func.lower(CraftOrder.crafter_character_name) == char.name.lower(),
            sa_func.lower(CraftOrder.crafter_character_realm) == char.realm.lower(),
            CraftOrder.status.in_(("completed", "collected")),
        )
        .order_by(CraftOrder.resolved_at.desc(), CraftOrder.claimed_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "item_name": row.item_name,
            "quantity": row.quantity,
            "profession_name": row.profession_name,
            "status": row.status,
        }
        for row in rows
    ]


def _snapshot_professions(db: Session, char: Character) -> list[dict]:
    skills = (
        db.query(CharacterProfessionSkill)
        .filter(CharacterProfessionSkill.character_id == char.id)
        .order_by(CharacterProfessionSkill.name.asc())
        .all()
    )
    return [
        {
            "name": skill.name,
            "id": skill.blizzard_profession_id,
            "current_skill": skill.skill_points,
            "current_max": skill.max_skill_points,
            "current_tier_name": skill.tier_name or "",
        }
        for skill in skills
    ]


@router.get("/{name}/{realm}/professions")
async def get_character_professions(
    name: str,
    realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Devuelve las profesiones del personaje consultando la API de Blizzard en tiempo real.
    Solo disponible para personajes Retail con Battle.net vinculado.
    """
    char = _get_own_character(name, realm, current_user, db)
    completed = _completed_craft_orders(db, char)

    # Warcraft Forever no tiene datos en la API de Blizzard
    if char.game != "retail":
        return {"primaries": [], "secondaries": [], "is_forever": True, "completed_orders": completed}

    # Necesitamos el token de Battle.net
    if not current_user.blizzard_access_token:
        saved = _snapshot_professions(db, char)
        return {
            "primaries": saved,
            "secondaries": [],
            "no_token": True,
            "completed_orders": completed,
        }

    realm_slug = realm.lower().replace(" ", "-")

    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/wow/character"
                f"/{realm_slug}/{name.lower()}/professions",
                headers={"Authorization": f"Bearer {current_user.blizzard_access_token}"},
                params={"namespace": f"profile-{BLIZZARD_REGION}", "locale": "es_ES"},
                timeout=8.0,
            )
        except Exception:
            return {
                "primaries": _snapshot_professions(db, char),
                "secondaries": [],
                "error": True,
                "completed_orders": completed,
            }

    if res.status_code == 401:
        return {
            "primaries": _snapshot_professions(db, char),
            "secondaries": [],
            "token_expired": True,
            "completed_orders": completed,
        }
    if res.status_code != 200:
        return {
            "primaries": _snapshot_professions(db, char),
            "secondaries": [],
            "completed_orders": completed,
        }

    raw = res.json()
    primaries = [summarize_profession(p) for p in raw.get("primaries", [])]
    secondaries = [summarize_profession(s) for s in raw.get("secondaries", [])]
    store_profession_snapshot(db, char.id, primaries + secondaries)
    return {"primaries": primaries, "secondaries": secondaries, "completed_orders": completed}
