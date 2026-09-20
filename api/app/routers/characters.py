"""
Router: /characters
Gestión de personajes WoW del usuario autenticado.
"""

import httpx
import os
import uuid as _uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.character import Character, CharacterRace
from app.models.character_title import CharacterTitle
from app.models.character_relation import CharacterRelation
from app.models.title import Title
from app.models.enums import CharacterClass
from app.schemas.character import (
    CharacterAddInput, CharacterResponse, BlizzardCharacterOut,
    SetMainInput, FavoriteTitleInput, TitleOut,
    CharacterBioUpdate, RelationCreate, RelationOut, RelationCharacterOut,
)

BLIZZARD_REGION = os.getenv("BLIZZARD_REGION", "eu")

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
        char.favorite_title_id = data.title_id

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
    """Actualiza identidad, trasfondo y datos personales de lore del personaje."""
    char = _get_own_character(name, realm, current_user, db)

    # Campos de identidad
    if data.surname      is not None: char.surname      = data.surname      or None
    if data.prefix_title is not None: char.prefix_title = data.prefix_title or None
    # Trasfondo narrativo
    if data.biography    is not None: char.biography    = data.biography    or None
    if data.personality  is not None: char.personality  = data.personality  or None
    if data.appearance   is not None: char.appearance   = data.appearance   or None
    # Datos personales de lore
    if data.origin       is not None: char.origin       = data.origin       or None
    if data.age_lore     is not None: char.age_lore     = data.age_lore
    if data.residence    is not None: char.residence    = data.residence    or None

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
        ))
    return result


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

    # Obtener render_url del Character Media API si es Retail y hay token
    render_url = None
    if data.game == "retail" and current_user.blizzard_access_token:
        async with httpx.AsyncClient() as client:
            render_url = await _fetch_character_render_url(
                client, data.name, data.realm, current_user.blizzard_access_token
            )

    char = Character(
        user_id=current_user.id,
        game=data.game,
        name=data.name,
        realm=data.realm,
        surname=data.surname or None,
        blizzard_character_id=data.blizzard_character_id,
        render_url=render_url,
        wow_class=wow_class,
        race=race,
        level=data.level,
        faction=data.faction,
        is_main=data.is_main,
        is_alt=not data.is_main,
        is_verified=True,
    )
    db.add(char)
    db.commit()
    db.refresh(char)
    return char


# ── Soft-delete ────────────────────────────────────────────────────────────────

async def _fetch_character_render_url(
    client: httpx.AsyncClient,
    name: str,
    realm: str,
    access_token: str,
) -> str | None:
    """
    Llama al Character Media API de Blizzard y devuelve la URL del render 'inset'.
    Devuelve None si el personaje no tiene render disponible.
    """
    try:
        res = await client.get(
            f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/wow/character/{realm}/{name.lower()}/character-media",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"namespace": f"profile-{BLIZZARD_REGION}", "locale": "es_ES"},
            timeout=8.0,
        )
        if res.status_code != 200:
            return None
        assets = res.json().get("assets", [])
        # Prioridad: main (cuerpo entero, mayor calidad) > inset (busto) > avatar (miniatura, solo como último recurso)
        for preferred in ("main", "inset", "avatar"):
            for asset in assets:
                if asset.get("key") == preferred:
                    return asset.get("value")
    except Exception:
        pass
    return None


@router.post("/sync-blizzard-ids", status_code=200)
async def sync_blizzard_ids(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Actualiza blizzard_character_id y render_url para los personajes Retail del usuario
    que coincidan por nombre+realm con los de su cuenta de Battle.net.
    Operacion idempotente y segura.
    """
    if not current_user.blizzard_access_token:
        return {"synced": 0}

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/user/wow",
            headers={"Authorization": f"Bearer {current_user.blizzard_access_token}"},
            params={"namespace": f"profile-{BLIZZARD_REGION}", "locale": "es_ES"},
        )

        if res.status_code != 200:
            return {"synced": 0}

        # Mapa (name_lower, realm_lower) -> blizzard_character_id
        bnet_index: dict[tuple[str, str], int] = {}
        for account in res.json().get("wow_accounts", []):
            for char in account.get("characters", []):
                key = (char["name"].lower(), char["realm"]["slug"].lower())
                bnet_index[key] = char["id"]

        # Sincronizar todos los personajes retail para asegurar render_url
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
            if key not in bnet_index:
                continue

            changed = False

            # Rellenar blizzard_character_id si falta
            if not char.blizzard_character_id:
                char.blizzard_character_id = bnet_index[key]
                changed = True

            # Rellenar render_url si falta O si solo tiene el tipo avatar (baja calidad)
            if not char.render_url or char.render_url.endswith("-avatar.jpg"):
                url = await _fetch_character_render_url(
                    client, char.name, char.realm, current_user.blizzard_access_token
                )
                if url:
                    char.render_url = url
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
    """Admin: lista todos los personajes con imagen pendiente de aprobación."""
    from app.models.user import User as UserModel
    results = (
        db.query(Character, UserModel.username)
        .join(UserModel, UserModel.id == Character.user_id)
        .filter(
            Character.pending_avatar_url.isnot(None),
            Character.deleted_at.is_(None),
        )
        .all()
    )
    return [
        {
            "name":              c.name,
            "realm":             c.realm,
            "game":              c.game,
            "owner_username":    username,
            "pending_avatar_url": f"http://localhost:8000/static/{c.pending_avatar_url}",
        }
        for c, username in results
    ]


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

@router.post("/{name}/{realm}/avatar", status_code=202)
async def upload_avatar(
    name: str, realm: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sube una imagen personalizada. Queda pendiente hasta que un admin la apruebe."""
    char = _get_own_character(name, realm, current_user, db)

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Solo se permiten imágenes JPEG, PNG o WebP.")

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(400, "La imagen no puede superar 5 MB.")

    ext = (file.filename or "avatar").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    filename = f"{char.id}_{_uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename

    with filepath.open("wb") as f:
        f.write(content)

    # Si había una imagen pendiente anterior, eliminarla del disco
    if char.pending_avatar_url:
        old = Path("uploads") / char.pending_avatar_url
        if old.exists():
            old.unlink(missing_ok=True)

    char.pending_avatar_url = f"avatars/{filename}"
    db.commit()
    return {"message": "Imagen enviada. Un admin la revisará antes de publicarla."}


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
    return {"message": "Imagen aprobada y publicada."}


@router.post("/{name}/{realm}/avatar/reject", status_code=200)
def reject_avatar(
    name: str, realm: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: rechaza la imagen pendiente de un personaje."""
    char = db.query(Character).filter(
        Character.name == name,
        Character.realm == realm,
        Character.deleted_at.is_(None),
    ).first()
    if not char:
        raise HTTPException(404, "Personaje no encontrado")
    if not char.pending_avatar_url:
        raise HTTPException(400, "No hay imagen pendiente para este personaje")

    old = Path("uploads") / char.pending_avatar_url
    old.unlink(missing_ok=True)
    char.pending_avatar_url = None
    db.commit()
    return {"message": "Imagen rechazada y eliminada."}


@router.delete("/{name}/{realm}/avatar", status_code=204)
def remove_custom_avatar(
    name: str, realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """El jugador puede cancelar su imagen pendiente o eliminar su imagen custom."""
    char = _get_own_character(name, realm, current_user, db)

    if char.pending_avatar_url:
        Path("uploads/" + char.pending_avatar_url).unlink(missing_ok=True)
        char.pending_avatar_url = None
    if char.custom_avatar_url:
        Path("uploads/" + char.custom_avatar_url).unlink(missing_ok=True)
        char.custom_avatar_url = None

    db.commit()


# ── Profesiones ────────────────────────────────────────────────────────────

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

    # Warcraft Forever no tiene datos en la API de Blizzard
    if char.game != "retail":
        return {"primaries": [], "secondaries": [], "is_forever": True}

    # Necesitamos el token de Battle.net
    if not current_user.blizzard_access_token:
        return {"primaries": [], "secondaries": [], "no_token": True}

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
            return {"primaries": [], "secondaries": [], "error": True}

    if res.status_code == 401:
        return {"primaries": [], "secondaries": [], "token_expired": True}
    if res.status_code != 200:
        return {"primaries": [], "secondaries": []}

    raw = res.json()

    def _parse(prof_data: dict) -> dict:
        tiers = prof_data.get("tiers", [])
        # Los tiers están ordenados de más antiguo a más nuevo
        # → el último es la expansión más reciente
        latest = tiers[-1] if tiers else None
        return {
            "name": prof_data.get("profession", {}).get("name", ""),
            "id":   prof_data.get("profession", {}).get("id", 0),
            "tiers": [
                {
                    "name":            t.get("tier", {}).get("name", ""),
                    "skill_points":    t.get("skill_points", 0),
                    "max_skill_points": t.get("max_skill_points", 0),
                    "recipe_count":    len(t.get("known_recipes", [])),
                }
                for t in tiers
            ],
            # Resumen rápido del tier más reciente
            "current_skill":      latest.get("skill_points", 0)     if latest else 0,
            "current_max":        latest.get("max_skill_points", 0) if latest else 0,
            "current_tier_name":  latest.get("tier", {}).get("name", "") if latest else "",
            "total_recipes":      sum(len(t.get("known_recipes", [])) for t in tiers),
        }

    return {
        "primaries":   [_parse(p) for p in raw.get("primaries",   [])],
        "secondaries": [_parse(s) for s in raw.get("secondaries", [])],
    }
