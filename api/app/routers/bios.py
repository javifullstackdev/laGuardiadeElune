from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.character import Character
from app.models.user import User
from app.schemas.bio import (
    BioAnswerView,
    BioPendingOut,
    BioPublishIn,
    BioQuestionOut,
    BioRejectIn,
)
from app.services.bio_questions import QUESTIONS, formatted_answers, has_public_sheet

router = APIRouter(prefix="/bios", tags=["bios"])


def _cover(char: Character) -> str | None:
    if char.custom_avatar_url:
        return f"http://localhost:8000/static/{char.custom_avatar_url}"
    return char.render_url


def _pending_out(char: Character, author: User) -> BioPendingOut:
    return BioPendingOut(
        character_id=char.id,
        character_name=char.name,
        character_realm=char.realm,
        author_username=author.username,
        cover_url=_cover(char),
        answers=[BioAnswerView(**row) for row in formatted_answers(char.bio_answers)],
        submitted_at=char.bio_submitted_at,
        bio_status=char.bio_status,
        current_biography=char.biography,
        current_personality=char.personality,
        current_appearance=char.appearance,
    )


@router.get("/questions", response_model=list[BioQuestionOut])
def list_questions():
    return QUESTIONS


@router.get("/pending", response_model=list[BioPendingOut])
def list_pending(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Character, User)
        .join(User, User.id == Character.user_id)
        .filter(
            Character.deleted_at.is_(None),
            Character.bio_answers_pending.is_(True),
        )
        .order_by(Character.bio_submitted_at.asc().nulls_last())
        .all()
    )
    return [_pending_out(char, author) for char, author in rows]


@router.post("/{character_id}/publish", response_model=BioPendingOut)
def publish_bio(
    character_id: str,
    body: BioPublishIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Character, User)
        .join(User, User.id == Character.user_id)
        .filter(Character.id == character_id, Character.deleted_at.is_(None))
        .first()
    )
    if not row:
        raise HTTPException(404, "Personaje no encontrado")
    char, author = row
    biography = (body.biography or "").strip()
    if len(biography) < 40:
        raise HTTPException(400, "La biografía es demasiado corta")
    char.biography = biography
    char.personality = (body.personality or "").strip() or None
    char.appearance = (body.appearance or "").strip() or None
    char.bio_status = "published"
    char.bio_answers_pending = False
    char.bio_rejection_reason = None
    db.commit()
    db.refresh(char)
    return _pending_out(char, author)


@router.post("/{character_id}/reject", response_model=BioPendingOut)
def reject_bio(
    character_id: str,
    body: BioRejectIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Character, User)
        .join(User, User.id == Character.user_id)
        .filter(Character.id == character_id, Character.deleted_at.is_(None))
        .first()
    )
    if not row:
        raise HTTPException(404, "Personaje no encontrado")
    char, author = row
    if not char.bio_answers_pending:
        raise HTTPException(409, "Este cuestionario no está en revisión")
    char.bio_answers_pending = False
    char.bio_rejection_reason = (body.reason or "").strip() or None
    if not has_public_sheet(char):
        char.bio_status = "draft"
    db.commit()
    db.refresh(char)
    return _pending_out(char, author)
