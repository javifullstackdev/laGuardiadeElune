"""
Router: /titles
Gestión del catálogo de títulos y asignación a personajes (solo admin/officer).
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
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

router = APIRouter(prefix="/titles", tags=["titles"])


# ── Schemas locales ──────────────────────────────────────────────────────────

class TitleCreateInput(BaseModel):
    name: str
    source: str = "custom"
    description: Optional[str] = None


class AwardTitleInput(BaseModel):
    """Datos para otorgar un título a un personaje identificado por nombre+realm."""
    character_name: str
    character_realm: str


# ── Helpers ──────────────────────────────────────────────────────────────────
# _require_admin eliminado: se usa require_admin de app.dependencies en su lugar


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
            description=title.description,
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
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Crea un nuevo título en el catálogo. Solo admin/officer."""

    existing = db.query(Title).filter(Title.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un título con ese nombre")

    title = Title(
        id=uuid.uuid4(),
        name=data.name,
        source=data.source,
        description=data.description,
    )
    db.add(title)
    db.commit()
    db.refresh(title)
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

    db.delete(ct)
    db.commit()
