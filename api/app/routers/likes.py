import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.models.character_story import ContentLike
from app.schemas.story import LikeState, LikeToggle

router = APIRouter(prefix="/likes", tags=["likes"])

ALLOWED = {"post", "story"}


def _count(db: Session, target_type: str, target_id):
    return (
        db.query(sa_func.count(ContentLike.id))
        .filter(ContentLike.target_type == target_type, ContentLike.target_id == target_id)
        .scalar()
        or 0
    )


@router.get("/", response_model=LikeState)
def get_like(
    target_type: str = Query(...),
    target_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_optional_user),
):
    if target_type not in ALLOWED:
        raise HTTPException(400, "Tipo no válido")
    liked = False
    if viewer:
        liked = (
            db.query(ContentLike)
            .filter(
                ContentLike.user_id == viewer.id,
                ContentLike.target_type == target_type,
                ContentLike.target_id == target_id,
            )
            .first()
            is not None
        )
    return LikeState(
        target_type=target_type,
        target_id=target_id,
        count=_count(db, target_type, target_id),
        liked=liked,
    )


@router.post("/", response_model=LikeState)
def toggle_like(
    body: LikeToggle,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.target_type not in ALLOWED:
        raise HTTPException(400, "Tipo no válido")

    existing = (
        db.query(ContentLike)
        .filter(
            ContentLike.user_id == current_user.id,
            ContentLike.target_type == body.target_type,
            ContentLike.target_id == body.target_id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        liked = False
    else:
        db.add(ContentLike(
            id=uuid.uuid4(),
            user_id=current_user.id,
            target_type=body.target_type,
            target_id=body.target_id,
        ))
        liked = True
    db.commit()
    return LikeState(
        target_type=body.target_type,
        target_id=body.target_id,
        count=_count(db, body.target_type, body.target_id),
        liked=liked,
    )
