from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.character import Character
from app.models.character_story import CharacterStory
from app.models.relation_claim import RelationClaim, Notification
from app.schemas.story import ClaimInboxItem
from app.services.claims import _upsert_relation

router = APIRouter(prefix="/claims", tags=["claims"])


@router.get("/pending", response_model=list[ClaimInboxItem])
def pending_for_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    my_chars = (
        db.query(Character.id)
        .filter(Character.user_id == current_user.id, Character.deleted_at.is_(None))
        .subquery()
    )
    rows = (
        db.query(RelationClaim, CharacterStory, Character, User)
        .join(CharacterStory, CharacterStory.id == RelationClaim.story_id)
        .join(Character, Character.id == RelationClaim.from_character_id)
        .join(User, User.id == RelationClaim.created_by)
        .filter(RelationClaim.to_character_id.in_(my_chars), RelationClaim.status == "pending")
        .order_by(RelationClaim.created_at.desc())
        .all()
    )
    return [
        ClaimInboxItem(
            id=claim.id,
            story_id=story.id,
            story_title=story.title,
            from_name=frm.name,
            from_realm=frm.realm,
            author_username=author.username,
            relation_type=claim.relation_type,
            met_at=claim.met_at,
            note=claim.note,
            status=claim.status,
        )
        for claim, story, frm, author in rows
    ]


@router.post("/{claim_id}/confirm", response_model=ClaimInboxItem)
def confirm_claim(
    claim_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _resolve(claim_id, current_user, db, "confirmed")


@router.post("/{claim_id}/reject", response_model=ClaimInboxItem)
def reject_claim(
    claim_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _resolve(claim_id, current_user, db, "rejected")


def _resolve(claim_id: str, current_user: User, db: Session, status: str) -> ClaimInboxItem:
    claim = db.query(RelationClaim).filter(RelationClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(404, "Mención no encontrada")
    target = db.query(Character).filter(Character.id == claim.to_character_id).first()
    if not target or target.user_id != current_user.id:
        raise HTTPException(403, "Solo el dueño del personaje mencionado puede responder")
    if claim.status != "pending":
        raise HTTPException(400, "Esta mención ya se resolvió")

    claim.status = status
    claim.resolved_by = current_user.id
    claim.resolved_at = datetime.now(timezone.utc)
    if status == "confirmed":
        _upsert_relation(db, claim)
    db.query(Notification).filter(Notification.claim_id == claim.id).update(
        {"read_at": datetime.now(timezone.utc)}
    )
    db.commit()

    story = db.query(CharacterStory).filter(CharacterStory.id == claim.story_id).first()
    frm = db.query(Character).filter(Character.id == claim.from_character_id).first()
    author = db.query(User).filter(User.id == claim.created_by).first()
    return ClaimInboxItem(
        id=claim.id,
        story_id=claim.story_id,
        story_title=story.title if story else "",
        from_name=frm.name if frm else "",
        from_realm=frm.realm if frm else "",
        author_username=author.username if author else "",
        relation_type=claim.relation_type,
        met_at=claim.met_at,
        note=claim.note,
        status=claim.status,
    )
