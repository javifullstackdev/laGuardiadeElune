from collections import defaultdict
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from fastapi import Depends

from app.database import get_db
from app.models.character import Character
from app.models.character_story import CharacterStory
from app.models.relation_claim import RelationClaim
from app.models.user import User
from app.schemas.character import (
    WikiCharacterOut, WikiListItem, WikiRelatedOut, WikiStoryOut, merge_public_fields,
)
from app.services.bio_questions import has_public_sheet

router = APIRouter(prefix="/wiki", tags=["wiki"])


def _enum_val(value) -> str | None:
    if value is None:
        return None
    return value.value if hasattr(value, "value") else str(value)


def _portrait(char: Character, story: CharacterStory | None = None) -> str | None:
    if story and story.cover_url:
        if story.cover_url.startswith("http"):
            return story.cover_url
        return f"http://localhost:8000/static/{story.cover_url}"
    if char.custom_avatar_url:
        return f"http://localhost:8000/static/{char.custom_avatar_url}"
    return char.render_url


def _display_name(char: Character) -> str:
    return f"{char.name}{(' ' + char.surname) if char.surname else ''}".strip()


def _shown_title(char: Character, fields: dict) -> str | None:
    if not fields.get("title"):
        return None
    if char.favorite_title and getattr(char.favorite_title, "name", None):
        return char.favorite_title.name
    return char.prefix_title


def _excerpt(text: str | None) -> str | None:
    if not text:
        return None
    compact = " ".join(text.split())
    return compact[:140].rstrip() + ("…" if len(compact) > 140 else "")


@router.get("/", response_model=list[WikiListItem])
def list_wiki(db: Session = Depends(get_db)):
    rows = (
        db.query(Character)
        .filter(
            Character.deleted_at.is_(None),
            Character.bio_status == "published",
            Character.biography.isnot(None),
        )
        .order_by(Character.name.asc(), Character.surname.asc())
        .all()
    )
    items: list[WikiListItem] = []
    for char in rows:
        if not has_public_sheet(char):
            continue
        fields = merge_public_fields(char.public_fields)
        items.append(
            WikiListItem(
                name=char.name,
                realm=char.realm,
                display_name=_display_name(char),
                title=_shown_title(char, fields),
                cover_url=_portrait(char),
                excerpt=_excerpt(char.biography or char.personality or char.appearance),
                wow_class=_enum_val(char.wow_class) if fields.get("class") else None,
                race=_enum_val(char.race) if fields.get("race") else None,
            )
        )
    return items


@router.get("/{realm}/{name}", response_model=WikiCharacterOut)
def get_wiki_character(realm: str, name: str, db: Session = Depends(get_db)):
    row = (
        db.query(Character, User)
        .join(User, User.id == Character.user_id)
        .filter(
            Character.name == name,
            Character.realm == realm,
            Character.deleted_at.is_(None),
            Character.bio_status == "published",
        )
        .first()
    )
    if not row or not has_public_sheet(row[0]):
        raise HTTPException(404, "Este personaje aún no tiene ficha pública")
    char, author = row
    fields = merge_public_fields(char.public_fields)

    stories = (
        db.query(CharacterStory)
        .filter(CharacterStory.character_id == char.id, CharacterStory.status == "approved")
        .order_by(CharacterStory.published_at.desc())
        .all()
    )

    claim_rows = (
        db.query(RelationClaim, Character)
        .join(Character, Character.id == RelationClaim.to_character_id)
        .join(CharacterStory, CharacterStory.id == RelationClaim.story_id)
        .filter(
            RelationClaim.from_character_id == char.id,
            RelationClaim.status == "confirmed",
            CharacterStory.status == "approved",
            Character.deleted_at.is_(None),
        )
        .all()
    )
    grouped: dict = defaultdict(lambda: {"char": None, "n": 0, "types": set()})
    for claim, other in claim_rows:
        bucket = grouped[other.id]
        bucket["char"] = other
        bucket["n"] += 1
        bucket["types"].add(claim.relation_type)

    related: list[WikiRelatedOut] = []
    ranked = sorted(grouped.values(), key=lambda x: x["n"], reverse=True)[:12]
    other_ids = [item["char"].id for item in ranked]
    published_ids = set()
    if other_ids:
        published_ids = {
            row[0]
            for row in db.query(Character.id)
            .filter(
                Character.id.in_(other_ids),
                Character.bio_status == "published",
                Character.biography.isnot(None),
            )
            .all()
        }
    for item in ranked:
        other = item["char"]
        related.append(
            WikiRelatedOut(
                name=other.name,
                realm=other.realm,
                story_count=item["n"],
                relation_types=sorted(item["types"]),
                has_page=other.id in published_ids,
                cover_url=_portrait(other),
                title=_shown_title(other, merge_public_fields(other.public_fields)) if other.id in published_ids else None,
            )
        )

    return WikiCharacterOut(
        name=char.name,
        realm=char.realm,
        display_name=_display_name(char),
        title=_shown_title(char, fields),
        cover_url=_portrait(char),
        biography=char.biography,
        personality=char.personality if fields.get("personality") else None,
        appearance=char.appearance if fields.get("appearance") else None,
        origin=char.origin if fields.get("origin") else None,
        age_lore=char.age_lore if fields.get("age") else None,
        residence=char.residence if fields.get("residence") else None,
        wow_class=_enum_val(char.wow_class) if fields.get("class") else None,
        race=_enum_val(char.race) if fields.get("race") else None,
        faction=char.faction if fields.get("faction") else None,
        author_username=author.username,
        related=related,
        stories=[
            WikiStoryOut(
                id=s.id,
                title=s.title,
                published_at=s.published_at.isoformat() if s.published_at else None,
            )
            for s in stories
        ],
    )
