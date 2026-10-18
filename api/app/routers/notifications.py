from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.relation_claim import Notification, RelationClaim
from app.models.user import User
from app.services.notifications import mark_passive_read

router = APIRouter(prefix="/notifications", tags=["notifications"])

LIMIT = 40


class NotificationOut(BaseModel):
    id: UUID
    kind: str
    title: str
    body: str | None
    href: str | None
    claim_id: UUID | None
    claim_status: str | None
    read: bool
    created_at: datetime


class NotificationList(BaseModel):
    unread: int
    items: list[NotificationOut]


def _list(db: Session, user: User) -> NotificationList:
    rows = (
        db.query(Notification, RelationClaim.status)
        .outerjoin(RelationClaim, RelationClaim.id == Notification.claim_id)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(LIMIT)
        .all()
    )
    unread = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .count()
    )
    items = [
        NotificationOut(
            id=note.id,
            kind=note.kind,
            title=note.title,
            body=note.body,
            href=note.href,
            claim_id=note.claim_id,
            claim_status=status,
            read=note.read_at is not None,
            created_at=note.created_at,
        )
        for note, status in rows
    ]
    items.sort(key=lambda item: (item.claim_status != "pending",))
    return NotificationList(unread=unread, items=items)


@router.get("", response_model=NotificationList)
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _list(db, current_user)


@router.post("/seen", response_model=NotificationList)
def mark_seen(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mark_passive_read(db, current_user.id)
    db.commit()
    return _list(db, current_user)


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_one_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if note is None:
        raise HTTPException(404, "Aviso no encontrado")
    if note.read_at is None:
        note.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(note)
    status = None
    if note.claim_id:
        claim = db.query(RelationClaim).filter(RelationClaim.id == note.claim_id).first()
        status = claim.status if claim else None
    return NotificationOut(
        id=note.id,
        kind=note.kind,
        title=note.title,
        body=note.body,
        href=note.href,
        claim_id=note.claim_id,
        claim_status=status,
        read=note.read_at is not None,
        created_at=note.created_at,
    )
