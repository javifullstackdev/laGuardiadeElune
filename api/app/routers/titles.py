"""
Router: /titles
Gestión del catálogo de títulos y asignación a personajes (solo admin/officer).
"""

import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.title import Title
from app.models.character import Character
from app.models.character_title import CharacterTitle
from app.schemas.character import TitleOut
from app.services import blizzard, title_sync

router = APIRouter(prefix="/titles", tags=["titles"])


# ── Schemas locales ──────────────────────────────────────────────────────────

class TitleCreateInput(BaseModel):
    name: str
    source: str = "custom"
    slot: str = "title"
    description: Optional[str] = None
    blizzard_title_id: Optional[int] = None


class BlizzardLinkInput(BaseModel):
    blizzard_title_id: Optional[int] = None


class AwardTitleInput(BaseModel):
    """Datos para otorgar un título a un personaje identificado por nombre+realm."""
    character_name: str
    character_realm: str


# ── Helpers ──────────────────────────────────────────────────────────────────

def _ensure_blizzard_id_free(
    db: Session, blizzard_title_id: int, exclude_title_id: Optional[UUID] = None
) -> None:
    query = db.query(Title.id).filter(Title.blizzard_title_id == blizzard_title_id)
    if exclude_title_id is not None:
        query = query.filter(Title.id != exclude_title_id)
    if query.first():
        raise HTTPException(
            status_code=400, detail="Ese título de Blizzard ya está en el catálogo"
        )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[TitleOut])
def list_titles(db: Session = Depends(get_db)):
    """Devuelve todos los títulos activos del catálogo (público)."""
    return db.query(Title).filter(Title.is_active == True).order_by(Title.name).all()


class CharacterBrief(BaseModel):
    """Datos básicos de un personaje que tiene un título."""
    name: str
    realm: str
    wow_class: Optional[str] = None

    model_config = {"from_attributes": True, "use_enum_values": True}


class TitleWithHolders(TitleOut):
    """Título con la lista de personajes que lo tienen."""
    holders: list[CharacterBrief] = []


@router.get("/admin", response_model=list[TitleWithHolders])
def list_titles_admin(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Devuelve todos los títulos con los personajes que los tienen.
    Solo admin/officer.
    """
    titles = db.query(Title).order_by(Title.name).all()
    result = []
    for title in titles:
        holders = (
            db.query(Character)
            .join(CharacterTitle, CharacterTitle.character_id == Character.id)
            .filter(
                CharacterTitle.title_id == title.id,
                Character.deleted_at.is_(None),
            )
            .all()
        )
        result.append(TitleWithHolders(
            id=title.id,
            name=title.name,
            source=title.source,
            slot=getattr(title, "slot", None) or "title",
            description=title.description,
            blizzard_title_id=title.blizzard_title_id,
            holders=[
                CharacterBrief(
                    name=h.name,
                    realm=h.realm,
                    wow_class=h.wow_class.value if h.wow_class else None,
                )
                for h in holders
            ],
        ))
    return result


@router.post("/", response_model=TitleOut, status_code=201)
def create_title(
    data: TitleCreateInput,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Crea un nuevo título en el catálogo. Solo admin/officer."""
    if data.blizzard_title_id is not None:
        _ensure_blizzard_id_free(db, data.blizzard_title_id)

    slot = data.slot if data.slot in ("title", "prefix") else "title"
    existing = db.query(Title).filter(Title.name == data.name, Title.slot == slot).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un título con ese nombre")

    title = Title(
        id=uuid.uuid4(),
        name=data.name,
        source=data.source,
        slot=slot,
        description=data.description,
        blizzard_title_id=data.blizzard_title_id,
    )
    db.add(title)
    db.commit()
    db.refresh(title)

    if title.blizzard_title_id is not None:
        background_tasks.add_task(title_sync.sync_all_characters)
    return title


@router.patch("/{title_id}/blizzard-link", response_model=TitleOut)
def link_blizzard_title(
    title_id: UUID,
    data: BlizzardLinkInput,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Enlaza un título existente con uno de Blizzard, o lo desenlaza con null.
    Al desenlazar, los personajes conservan el título: pasa a ser solo de la web.
    """
    title = db.query(Title).filter(Title.id == title_id).first()
    if not title:
        raise HTTPException(status_code=404, detail="Título no encontrado")

    if data.blizzard_title_id is not None:
        _ensure_blizzard_id_free(db, data.blizzard_title_id, exclude_title_id=title.id)

    title.blizzard_title_id = data.blizzard_title_id
    db.commit()
    db.refresh(title)

    if title.blizzard_title_id is not None:
        background_tasks.add_task(title_sync.sync_all_characters)
    return title


@router.post("/{title_id}/award", status_code=201)
def award_title(
    title_id: UUID,
    data: AwardTitleInput,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Otorga un título a un personaje (buscado por nombre+realm).
    Solo admin/officer puede otorgar títulos.
    """
    title = db.query(Title).filter(Title.id == title_id, Title.is_active == True).first()
    if not title:
        raise HTTPException(status_code=404, detail="Título no encontrado")

    char = (
        db.query(Character)
        .filter(
            Character.name == data.character_name,
            Character.realm == data.character_realm,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not char:
        raise HTTPException(
            status_code=404,
            detail=f"Personaje {data.character_name}-{data.character_realm} no encontrado"
        )

    already = (
        db.query(CharacterTitle)
        .filter(
            CharacterTitle.character_id == char.id,
            CharacterTitle.title_id == title.id,
        )
        .first()
    )
    if already:
        raise HTTPException(status_code=400, detail="El personaje ya tiene ese título")

    ct = CharacterTitle(character_id=char.id, title_id=title.id)
    db.add(ct)
    db.commit()

    return {
        "message": f"Título '{title.name}' otorgado a {char.name}-{char.realm}",
        "title_id": str(title.id),
        "character_id": str(char.id),
    }


@router.delete("/{title_id}/revoke", status_code=204)
def revoke_title(
    title_id: UUID,
    data: AwardTitleInput,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Revoca un título de un personaje. Solo admin/officer."""

    char = (
        db.query(Character)
        .filter(
            Character.name == data.character_name,
            Character.realm == data.character_realm,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not char:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    ct = (
        db.query(CharacterTitle)
        .filter(
            CharacterTitle.character_id == char.id,
            CharacterTitle.title_id == title_id,
        )
        .first()
    )
    if not ct:
        raise HTTPException(status_code=404, detail="El personaje no tiene ese título")

    # Si era el favorito, quitarlo también
    if char.favorite_title_id == title_id:
        char.favorite_title_id = None
    if char.favorite_prefix_id == title_id:
        char.favorite_prefix_id = None
        char.prefix_title = None

    db.delete(ct)
    db.commit()


# ── Selector de títulos de Blizzard ──────────────────────────────────────────

class BlizzardTitleHit(BaseModel):
    id: int
    name: str
    already_linked: bool


class BlizzardTitleDetail(BaseModel):
    id: int
    name: str
    template: str
    slot: str
    source_type: Optional[str] = None
    achievements: list[str] = []
    already_linked: bool


def _linked_blizzard_ids(db: Session, ids: list[int]) -> set[int]:
    if not ids:
        return set()
    rows = db.query(Title.blizzard_title_id).filter(Title.blizzard_title_id.in_(ids)).all()
    return {row[0] for row in rows}


@router.get("/blizzard-index", response_model=list[BlizzardTitleHit])
async def search_blizzard_titles(
    q: str = Query(..., min_length=2),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Busca en el índice de títulos de Blizzard. Solo admin/officer."""
    try:
        hits = await blizzard.search_titles(q)
    except blizzard.BlizzardError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    linked = _linked_blizzard_ids(db, [h["id"] for h in hits])
    return [BlizzardTitleHit(**h, already_linked=h["id"] in linked) for h in hits]


@router.get("/blizzard-index/{blizzard_title_id}", response_model=BlizzardTitleDetail)
async def get_blizzard_title(
    blizzard_title_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Detalle de un título de Blizzard con el slot deducido de su plantilla."""
    try:
        detail = await blizzard.get_title(blizzard_title_id)
    except blizzard.BlizzardError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    if detail is None:
        raise HTTPException(status_code=404, detail="Ese título no existe en Blizzard")

    linked = _linked_blizzard_ids(db, [blizzard_title_id])
    return BlizzardTitleDetail(**detail, already_linked=blizzard_title_id in linked)

