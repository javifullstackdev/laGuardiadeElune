from collections import defaultdict
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.character import Character
from app.models.craft import CharacterProfessionSkill, CraftOrder
from app.models.relation_claim import Notification, RelationClaim
from app.models.user import User
from app.services.notifications import mark_passive_read

router = APIRouter(prefix="/notifications", tags=["notifications"])

LIMIT = 40


class CraftCharacterOut(BaseModel):
    name: str
    realm: str
    skill_points: int


class NotificationOut(BaseModel):
    id: UUID
    kind: str
    title: str
    body: str | None
    href: str | None
    claim_id: UUID | None
    claim_status: str | None
    craft_order_id: UUID | None = None
    craft_status: str | None = None
    characters: list[CraftCharacterOut] = Field(default_factory=list)
    read: bool
    created_at: datetime


class NotificationList(BaseModel):
    unread: int
    items: list[NotificationOut]


def _crafter_options(db: Session, user: User, profession_ids: set[int]) -> dict[int, list[CraftCharacterOut]]:
    if not profession_ids:
        return {}
    rows = (
        db.query(CharacterProfessionSkill, Character)
        .join(Character, Character.id == CharacterProfessionSkill.character_id)
        .filter(
            Character.user_id == user.id,
            Character.deleted_at.is_(None),
            CharacterProfessionSkill.blizzard_profession_id.in_(profession_ids),
        )
        .all()
    )
    grouped: dict[int, list[CraftCharacterOut]] = defaultdict(list)
    for skill, char in rows:
        grouped[skill.blizzard_profession_id].append(
            CraftCharacterOut(name=char.name, realm=char.realm, skill_points=skill.skill_points)
        )
    for options in grouped.values():
        options.sort(key=lambda row: -row.skill_points)
    return grouped


def _list(db: Session, user: User) -> NotificationList:
    rows = (
        db.query(Notification, RelationClaim.status, CraftOrder.status, CraftOrder.profession_id)
        .outerjoin(RelationClaim, RelationClaim.id == Notification.claim_id)
        .outerjoin(CraftOrder, CraftOrder.id == Notification.craft_order_id)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(LIMIT)
        .all()
    )
    open_professions = {
        profession_id
        for note, _, craft_status, profession_id in rows
        if note.kind == "craft_offer" and craft_status == "open" and profession_id
    }
    options = _crafter_options(db, user, open_professions)
    unread = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .count()
    )
    items = []
    for note, claim_status, craft_status, profession_id in rows:
        characters = []
        if note.kind == "craft_offer" and craft_status == "open" and profession_id:
            characters = options.get(profession_id, [])
        items.append(
            NotificationOut(
                id=note.id,
                kind=note.kind,
                title=note.title,
                body=note.body,
                href=note.href,
                claim_id=note.claim_id,
                claim_status=claim_status,
                craft_order_id=note.craft_order_id,
                craft_status=craft_status,
                characters=characters,
                read=note.read_at is not None,
                created_at=note.created_at,
            )
        )
    def _needs_answer(item: NotificationOut) -> bool:
        if item.claim_status == "pending":
            return True
        if item.kind == "craft_offer" and item.craft_status == "open":
            return True
        if item.kind == "craft_accepted" and item.craft_status == "claimed":
            return True
        return item.kind == "craft_ready" and item.craft_status == "completed"

    items.sort(key=lambda item: (not _needs_answer(item),))
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
