from datetime import datetime, timezone
import uuid
from sqlalchemy.orm import Session
from app.models.character import Character
from app.models.character_relation import CharacterRelation, RELATION_TYPES
from app.models.character_story import CharacterStory
from app.models.relation_claim import RelationClaim, Notification
from app.models.user import User
from app.schemas.story import StoryRelationOut


def claim_rows(db: Session, story_id) -> list[tuple[RelationClaim, Character, User]]:
    return (
        db.query(RelationClaim, Character, User)
        .join(Character, Character.id == RelationClaim.to_character_id)
        .join(User, User.id == Character.user_id)
        .filter(RelationClaim.story_id == story_id)
        .all()
    )


def claims_out(db: Session, story_id) -> list[StoryRelationOut]:
    return [
        StoryRelationOut(
            name=char.name,
            realm=char.realm,
            relation_type=claim.relation_type,
            met_at=claim.met_at,
            note=claim.note,
            status=claim.status,
            owner_username=owner.username,
        )
        for claim, char, owner in claim_rows(db, story_id)
    ]


def awaiting_relations(db: Session, story_id) -> bool:
    return (
        db.query(RelationClaim)
        .filter(RelationClaim.story_id == story_id, RelationClaim.status == "pending")
        .first()
        is not None
    )


def replace_claims(db: Session, story: CharacterStory, author: User, from_char: Character, mentions) -> None:
    old_ids = [row[0] for row in db.query(RelationClaim.id).filter(RelationClaim.story_id == story.id).all()]
    if old_ids:
        db.query(Notification).filter(Notification.claim_id.in_(old_ids)).delete(synchronize_session=False)
        db.query(RelationClaim).filter(RelationClaim.id.in_(old_ids)).delete(synchronize_session=False)

    seen: set[tuple[str, str]] = set()
    for mention in mentions:
        key = (mention.to_name.strip().lower(), mention.to_realm.strip().lower())
        if key in seen:
            continue
        seen.add(key)
        if mention.relation_type not in RELATION_TYPES:
            from fastapi import HTTPException
            raise HTTPException(400, f"Tipo de relación no válido: {mention.relation_type}")
        target = (
            db.query(Character)
            .filter(
                Character.name == mention.to_name,
                Character.realm == mention.to_realm,
                Character.deleted_at.is_(None),
            )
            .first()
        )
        if not target:
            from fastapi import HTTPException
            raise HTTPException(400, f"{mention.to_name} no es un personaje de la hermandad")
        if target.id == from_char.id:
            from fastapi import HTTPException
            raise HTTPException(400, "No puedes mencionarte a ti mismo")

        claim = RelationClaim(
            id=uuid.uuid4(),
            story_id=story.id,
            from_character_id=from_char.id,
            to_character_id=target.id,
            relation_type=mention.relation_type,
            met_at=(mention.met_at or "").strip() or None,
            note=(mention.note or "").strip() or None,
            status="pending",
            created_by=author.id,
        )
        db.add(claim)
        db.flush()
        if target.user_id != author.id:
            db.add(Notification(
                id=uuid.uuid4(),
                user_id=target.user_id,
                kind="relation_claim",
                title=f"{from_char.name} te ha nombrado",
                body=f"{author.username} menciona a {target.name} en «{story.title}» y propone una relación.",
                claim_id=claim.id,
            ))
        else:
            # Mismo jugador, otro personaje: auto-confirmar
            claim.status = "confirmed"
            claim.resolved_by = author.id
            claim.resolved_at = datetime.now(timezone.utc)
            _upsert_relation(db, claim)


def _upsert_relation(db: Session, claim: RelationClaim) -> None:
    existing = (
        db.query(CharacterRelation)
        .filter(
            CharacterRelation.from_character_id == claim.from_character_id,
            CharacterRelation.to_character_id == claim.to_character_id,
            CharacterRelation.relation_type == claim.relation_type,
        )
        .first()
    )
    desc_parts = [p for p in (claim.met_at and f"Se conocieron en {claim.met_at}", claim.note) if p]
    description = " · ".join(desc_parts) or None
    if existing:
        if description:
            existing.description = description
        return
    db.add(CharacterRelation(
        id=uuid.uuid4(),
        from_character_id=claim.from_character_id,
        to_character_id=claim.to_character_id,
        relation_type=claim.relation_type,
        description=description,
    ))
