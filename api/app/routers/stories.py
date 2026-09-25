from datetime import datetime, timezone
from pathlib import Path
import json
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user, require_admin
from app.models.user import User
from app.models.character import Character
from app.models.character_story import CharacterStory, ContentLike
from app.schemas.story import (
    StoryMentionIn, StoryReject, StoryApprove, StoryPublic, StoryMine, StoryPending,
)
from app.services.claims import (
    awaiting_relations, claims_out, replace_claims,
)

router = APIRouter(prefix="/stories", tags=["stories"])

STORY_UPLOAD_DIR = Path("uploads/stories")
STORY_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_COVER_SIZE = 5 * 1024 * 1024


def _cover_url(story: CharacterStory, char: Character) -> str | None:
    if story.cover_url:
        if story.cover_url.startswith("http"):
            return story.cover_url
        return f"http://localhost:8000/static/{story.cover_url}"
    if char.custom_avatar_url:
        return f"http://localhost:8000/static/{char.custom_avatar_url}"
    return char.render_url


def _mine_out(db: Session, story: CharacterStory, char: Character) -> StoryMine:
    return StoryMine(
        id=story.id,
        status=story.status,
        title=story.title,
        rejection_reason=story.rejection_reason,
        submitted_at=story.submitted_at,
        published_at=story.published_at,
        awaiting_relations=awaiting_relations(db, story.id),
        cover_url=_cover_url(story, char),
        biography=story.biography,
        personality=story.personality,
        appearance=story.appearance,
    )


def _class_value(char: Character) -> str | None:
    if char.wow_class is None:
        return None
    return char.wow_class.value if hasattr(char.wow_class, "value") else str(char.wow_class)


def _like_count(db: Session, story_id) -> int:
    return (
        db.query(sa_func.count(ContentLike.id))
        .filter(ContentLike.target_type == "story", ContentLike.target_id == story_id)
        .scalar()
        or 0
    )


def _to_public(db: Session, story: CharacterStory, char: Character, author: User) -> StoryPublic:
    return StoryPublic(
        id=story.id,
        title=story.title,
        status=story.status,
        biography=story.biography,
        personality=story.personality,
        appearance=story.appearance,
        published_at=story.published_at,
        character_name=char.name,
        character_realm=char.realm,
        character_class=_class_value(char),
        cover_url=_cover_url(story, char),
        author_username=author.username,
        like_count=_like_count(db, story.id),
        relations=[r for r in claims_out(db, story.id) if r.status == "confirmed" or story.status != "approved"],
    )


@router.get("/", response_model=list[StoryPublic])
def list_published(db: Session = Depends(get_db)):
    rows = (
        db.query(CharacterStory, Character, User)
        .join(Character, Character.id == CharacterStory.character_id)
        .join(User, User.id == CharacterStory.author_id)
        .filter(CharacterStory.status == "approved")
        .order_by(CharacterStory.published_at.desc())
        .all()
    )
    return [_to_public(db, story, char, author) for story, char, author in rows]


@router.get("/pending", response_model=list[StoryPending])
def list_pending(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(CharacterStory, Character, User)
        .join(Character, Character.id == CharacterStory.character_id)
        .join(User, User.id == CharacterStory.author_id)
        .filter(CharacterStory.status == "pending")
        .order_by(CharacterStory.submitted_at.asc())
        .all()
    )
    return [
        StoryPending(
            id=story.id,
            title=story.title,
            biography=story.biography,
            personality=story.personality,
            appearance=story.appearance,
            submitted_at=story.submitted_at,
            character_name=char.name,
            character_realm=char.realm,
            author_username=author.username,
            relations=claims_out(db, story.id),
            awaiting_relations=awaiting_relations(db, story.id),
            cover_url=_cover_url(story, char),
        )
        for story, char, author in rows
    ]


@router.get("/mine", response_model=list[StoryMine])
def get_mine(
    name: str,
    realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = (
        db.query(Character)
        .filter(
            Character.user_id == current_user.id,
            Character.name == name,
            Character.realm == realm,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not char:
        return []
    stories = (
        db.query(CharacterStory)
        .filter(CharacterStory.character_id == char.id)
        .order_by(CharacterStory.submitted_at.desc())
        .all()
    )
    return [_mine_out(db, story, char) for story in stories]


@router.get("/{story_id}", response_model=StoryPublic)
def get_story(
    story_id: str,
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_optional_user),
):
    row = (
        db.query(CharacterStory, Character, User)
        .join(Character, Character.id == CharacterStory.character_id)
        .join(User, User.id == CharacterStory.author_id)
        .filter(CharacterStory.id == story_id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Historia no encontrada")
    story, char, author = row
    is_staff = viewer and viewer.role.value in ("admin", "officer")
    is_owner = viewer and viewer.id == story.author_id
    if story.status != "approved" and not is_staff and not is_owner:
        raise HTTPException(404, "Historia no encontrada")
    return _to_public(db, story, char, author)


async def _save_cover(story_id, file: UploadFile) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "La portada debe ser JPEG, PNG o WebP")
    content = await file.read()
    if len(content) > MAX_COVER_SIZE:
        raise HTTPException(400, "La portada no puede superar 5 MB")
    ext = (file.filename or "cover").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    filename = f"{story_id}_{uuid.uuid4().hex}.{ext}"
    path = STORY_UPLOAD_DIR / filename
    path.write_bytes(content)
    return f"stories/{filename}"


@router.post("/submit", response_model=StoryMine)
async def submit_story(
    name: str = Form(...),
    realm: str = Form(...),
    title: str | None = Form(None),
    body: str = Form(...),
    mentions: str = Form("[]"),
    cover: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = (
        db.query(Character)
        .filter(
            Character.user_id == current_user.id,
            Character.name == name,
            Character.realm == realm,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not char:
        raise HTTPException(404, "Personaje no encontrado")
    story_body = " ".join((body or "").split())
    if len(story_body) < 80:
        raise HTTPException(400, "La historia es demasiado corta")

    try:
        mention_items = [StoryMentionIn.model_validate(m) for m in json.loads(mentions or "[]")]
    except Exception:
        raise HTTPException(400, "Las menciones no son válidas")

    display = f"{char.prefix_title + ' ' if char.prefix_title else ''}{char.name}{(' ' + char.surname) if char.surname else ''}".strip()
    story_title = (title or "").strip() or display

    now = datetime.now(timezone.utc)
    story = CharacterStory(
        id=uuid.uuid4(),
        character_id=char.id,
        author_id=current_user.id,
        title=story_title,
        biography=body.strip(),
        personality=None,
        appearance=None,
        status="pending",
        submitted_at=now,
    )
    db.add(story)
    db.flush()

    if cover and cover.filename:
        story.cover_url = await _save_cover(story.id, cover)

    replace_claims(db, story, current_user, char, mention_items)
    db.commit()
    db.refresh(story)
    return _mine_out(db, story, char)


@router.post("/{story_id}/approve", response_model=StoryPending)
def approve_story(
    story_id: str,
    body: StoryApprove | None = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = (
        db.query(CharacterStory, Character, User)
        .join(Character, Character.id == CharacterStory.character_id)
        .join(User, User.id == CharacterStory.author_id)
        .filter(CharacterStory.id == story_id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Historia no encontrada")
    story, char, author = row
    override = bool(body and body.override)
    if awaiting_relations(db, story.id) and not override:
        raise HTTPException(409, "Faltan confirmaciones de relación. Solo el Eremita puede publicarla igual.")
    now = datetime.now(timezone.utc)
    story.status = "approved"
    story.rejection_reason = None
    story.reviewed_at = now
    story.reviewer_id = current_user.id
    story.published_at = now
    story.eremita_override = override
    db.commit()
    return StoryPending(
        id=story.id,
        title=story.title,
        biography=story.biography,
        personality=story.personality,
        appearance=story.appearance,
        submitted_at=story.submitted_at,
        character_name=char.name,
        character_realm=char.realm,
        author_username=author.username,
        relations=claims_out(db, story.id),
        awaiting_relations=awaiting_relations(db, story.id),
        cover_url=_cover_url(story, char),
    )


@router.post("/{story_id}/reject", response_model=StoryPending)
def reject_story(
    story_id: str,
    body: StoryReject,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = (
        db.query(CharacterStory, Character, User)
        .join(Character, Character.id == CharacterStory.character_id)
        .join(User, User.id == CharacterStory.author_id)
        .filter(CharacterStory.id == story_id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Historia no encontrada")
    story, char, author = row
    story.status = "rejected"
    story.rejection_reason = (body.reason or "").strip() or None
    story.reviewed_at = datetime.now(timezone.utc)
    story.reviewer_id = current_user.id
    story.published_at = None
    db.commit()
    return StoryPending(
        id=story.id,
        title=story.title,
        biography=story.biography,
        personality=story.personality,
        appearance=story.appearance,
        submitted_at=story.submitted_at,
        character_name=char.name,
        character_realm=char.realm,
        author_username=author.username,
        relations=claims_out(db, story.id),
        awaiting_relations=awaiting_relations(db, story.id),
        cover_url=_cover_url(story, char),
    )


def _remove_cover_file(story: CharacterStory) -> None:
    if not story.cover_url or story.cover_url.startswith("http"):
        return
    Path("uploads", story.cover_url).unlink(missing_ok=True)


def _reassign_published(db: Session, char: Character, removed_id) -> None:
    if char.published_story_id != removed_id:
        return
    nxt = (
        db.query(CharacterStory)
        .filter(
            CharacterStory.character_id == char.id,
            CharacterStory.status == "approved",
            CharacterStory.id != removed_id,
        )
        .order_by(CharacterStory.published_at.desc())
        .first()
    )
    if nxt:
        char.published_story_id = nxt.id
        return
    char.published_story_id = None


@router.delete("/{story_id}", status_code=204)
def delete_story(
    story_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = (
        db.query(CharacterStory, Character)
        .join(Character, Character.id == CharacterStory.character_id)
        .filter(CharacterStory.id == story_id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Historia no encontrada")
    story, char = row
    _reassign_published(db, char, story.id)
    db.flush()
    db.query(ContentLike).filter(
        ContentLike.target_type == "story",
        ContentLike.target_id == story.id,
    ).delete(synchronize_session=False)
    _remove_cover_file(story)
    db.delete(story)
    db.commit()
    return Response(status_code=204)
