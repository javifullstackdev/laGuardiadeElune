from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
import json
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func, or_

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user, require_admin
from app.models.user import User
from app.models.character import Character
from app.models.character_story import CharacterStory, ContentLike
from app.schemas.story import (
    StoryMentionIn, StoryReject, StoryApprove, StoryPublic, StoryMine, StoryPending, StoryHeadingIn, StoryBodyIn,
    StoryAppearanceIn, StoryRelationOut,
)
from app.services.claims import (
    add_appearance, awaiting_relations, claims_out, remove_appearance, replace_claims,
)
from app.services.image_bytes import read_image
from app.services.missions import grant_ready
from app.services.notifications import notify
from app.services.slugs import RESERVED_SLUGS, is_uuid, slugify, unique_slug
from app.services.surnames import visible_surname
from app.urls import static_url

router = APIRouter(prefix="/stories", tags=["stories"])

STORY_UPLOAD_DIR = Path("uploads/stories")
STORY_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_COVER_SIZE = 5 * 1024 * 1024


def _cover_url(story: CharacterStory, char: Character) -> str | None:
    """Portada de historia > imagen completa custom > render (nunca la cara del ranking)."""
    if story.cover_url:
        return static_url(story.cover_url)
    if char.custom_avatar_url:
        return static_url(char.custom_avatar_url)
    return char.render_url


def _mine_out(db: Session, story: CharacterStory, char: Character) -> StoryMine:
    return StoryMine(
        id=story.id,
        slug=story.slug,
        status=story.status,
        title=story.title,
        subtitle=story.subtitle,
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


def _race_value(char: Character) -> str | None:
    if char.race is None:
        return None
    return char.race.value if hasattr(char.race, "value") else str(char.race)


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
        slug=story.slug,
        title=story.title,
        subtitle=story.subtitle,
        status=story.status,
        biography=story.biography,
        personality=story.personality,
        appearance=story.appearance,
        published_at=story.published_at,
        character_name=char.name,
        character_surname=visible_surname(char),
        character_realm=char.realm,
        character_class=_class_value(char),
        character_faction=char.faction,
        character_race=_race_value(char),
        cover_url=_cover_url(story, char),
        og_image_url=_og_image_url(story),
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
            subtitle=story.subtitle,
            biography=story.biography,
            personality=story.personality,
            appearance=story.appearance,
            submitted_at=story.submitted_at,
            character_name=char.name,
            character_realm=char.realm,
            character_faction=char.faction,
            character_race=_race_value(char),
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
        .filter(
            CharacterStory.id == story_id
            if is_uuid(story_id)
            else or_(CharacterStory.slug == story_id, CharacterStory.slug_aliases.any(story_id))
        )
        .first()
    )
    if not row:
        raise HTTPException(404, "Historia no encontrada")
    story, char, author = row
    is_staff = viewer and viewer.role.value == "admin"
    is_owner = viewer and viewer.id == story.author_id
    if story.status != "approved" and not is_staff and not is_owner:
        raise HTTPException(404, "Historia no encontrada")
    return _to_public(db, story, char, author)


async def _save_cover(story_id, file: UploadFile) -> str:
    content, ext = await read_image(
        file, max_bytes=MAX_COVER_SIZE, too_big="La portada no puede superar 5 MB"
    )
    filename = f"{story_id}_{uuid.uuid4().hex}.{ext}"
    path = STORY_UPLOAD_DIR / filename
    path.write_bytes(content)
    return f"stories/{filename}"


@router.post("/submit", response_model=StoryMine)
async def submit_story(
    name: str = Form(...),
    realm: str = Form(...),
    title: str | None = Form(None),
    subtitle: str | None = Form(None),
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

    prefix = None
    if getattr(char, "favorite_prefix", None) and char.favorite_prefix.name:
        prefix = char.favorite_prefix.name
    elif char.prefix_title:
        prefix = char.prefix_title
    surname = visible_surname(char)
    display = f"{(prefix + ' ') if prefix else ''}{char.name}{(' ' + surname) if surname else ''}".strip()
    story_title = (title or "").strip() or display

    now = datetime.now(timezone.utc)
    story = CharacterStory(
        id=uuid.uuid4(),
        character_id=char.id,
        author_id=current_user.id,
        title=story_title,
        subtitle=_clean_subtitle(subtitle),
        slug=unique_slug(db, CharacterStory, story_title, "historia"),
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
    notify(
        db,
        user_id=author.id,
        kind="eremita_story",
        title="El Eremita ha publicado tu historia",
        body=f"«{story.title}» ya está en la web.",
        href=f"/lore/{quote(story.slug or str(story.id), safe='')}",
    )
    grant_ready(db, author)
    db.commit()
    return StoryPending(
        id=story.id,
        title=story.title,
        subtitle=story.subtitle,
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
    reason = story.rejection_reason
    message = f"«{story.title}» necesita cambios."
    if reason:
        message = f"{message} {reason}"
    notify(
        db,
        user_id=author.id,
        kind="eremita_story",
        title="El Eremita ha respondido a tu historia",
        body=message,
    )
    db.commit()
    return StoryPending(
        id=story.id,
        title=story.title,
        subtitle=story.subtitle,
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


def _clean_title(value: str | None) -> str:
    text = " ".join((value or "").split())
    if not text:
        raise HTTPException(400, "El título no puede estar vacío")
    if len(text) > 255:
        raise HTTPException(400, "El título no puede superar 255 caracteres")
    return text


def _clean_subtitle(value: str | None) -> str | None:
    text = " ".join((value or "").split())
    if not text:
        return None
    if len(text) > 80:
        raise HTTPException(400, "El subtítulo no puede superar 80 caracteres")
    return text


def _remove_stored_file(relative: str | None) -> None:
    if not relative or relative.startswith("http"):
        return
    Path("uploads", relative).unlink(missing_ok=True)


def _og_image_url(story: CharacterStory) -> str | None:
    if story.og_image_url:
        return static_url(story.og_image_url)
    return None


def _remove_cover_file(story: CharacterStory) -> None:
    _remove_stored_file(story.cover_url)


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


@router.post("/{story_id}/cover")
async def replace_story_cover(
    story_id: str,
    cover: UploadFile = File(...),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Cambia la portada de una historia ya publicada."""
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
    if story.status != "approved":
        raise HTTPException(409, "Solo se puede cambiar la imagen de una historia publicada")
    if not cover.filename:
        raise HTTPException(400, "Falta la imagen")
    new_path = await _save_cover(story.id, cover)
    _remove_cover_file(story)
    story.cover_url = new_path
    notify(
        db,
        user_id=author.id,
        kind="eremita_story",
        title="El Eremita ha actualizado tu historia",
        body=f"La imagen de «{story.title}» ya es la nueva.",
        href=f"/lore/{quote(story.slug or str(story.id), safe='')}",
    )
    db.commit()
    return {"cover_url": _cover_url(story, char)}


@router.post("/{story_id}/og-image")
async def replace_story_og_image(
    story_id: str,
    image: UploadFile = File(...),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Imagen horizontal que WhatsApp y X muestran al compartir. No cambia la portada."""
    story = db.query(CharacterStory).filter(CharacterStory.id == story_id).first()
    if not story:
        raise HTTPException(404, "Historia no encontrada")
    if story.status != "approved":
        raise HTTPException(409, "Solo se puede cambiar la imagen de una historia publicada")
    if not image.filename:
        raise HTTPException(400, "Falta la imagen")
    new_path = await _save_cover(story.id, image)
    _remove_stored_file(story.og_image_url)
    story.og_image_url = new_path
    db.commit()
    return {"og_image_url": _og_image_url(story)}


@router.delete("/{story_id}/og-image", status_code=204)
def clear_story_og_image(
    story_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    story = db.query(CharacterStory).filter(CharacterStory.id == story_id).first()
    if not story:
        raise HTTPException(404, "Historia no encontrada")
    _remove_stored_file(story.og_image_url)
    story.og_image_url = None
    db.commit()
    return Response(status_code=204)


@router.post("/{story_id}/heading")
def set_story_heading(
    story_id: str,
    body: StoryHeadingIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Cambia el título, el subtítulo y el enlace de una historia ya publicada."""
    row = (
        db.query(CharacterStory, User)
        .join(User, User.id == CharacterStory.author_id)
        .filter(CharacterStory.id == story_id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Historia no encontrada")
    story, author = row
    if story.status != "approved":
        raise HTTPException(409, "Solo se puede cambiar el título de una historia publicada")
    new_title = _clean_title(body.title)
    title_changed = new_title != story.title
    story.title = new_title
    story.subtitle = _clean_subtitle(body.subtitle)
    _apply_story_slug(db, story, body.slug, story.title)
    if title_changed:
        notify(
            db,
            user_id=author.id,
            kind="eremita_story",
            title="El Eremita ha actualizado tu historia",
            body=f"El título ahora es «{story.title}».",
            href=f"/lore/{quote(story.slug or str(story.id), safe='')}",
        )
    db.commit()
    return {"title": story.title, "subtitle": story.subtitle, "slug": story.slug}


def _apply_story_slug(db: Session, story: CharacterStory, raw: str | None, title: str) -> None:
    text = (raw or "").strip()
    if text:
        slug = slugify(text, "")
        if not slug:
            raise HTTPException(400, "El enlace no es válido")
        if is_uuid(slug) or slug in RESERVED_SLUGS:
            raise HTTPException(400, "Ese enlace está reservado")
        taken = (
            db.query(CharacterStory.id)
            .filter(
                CharacterStory.id != story.id,
                or_(CharacterStory.slug == slug, CharacterStory.slug_aliases.any(slug)),
            )
            .first()
        )
        if taken:
            raise HTTPException(400, "Ese enlace ya lo usa otra historia")
    else:
        slug = unique_slug(db, CharacterStory, title, "historia", exclude_id=story.id)
    previous = story.slug
    aliases = [item for item in (story.slug_aliases or []) if item and item != slug]
    if previous and previous != slug and previous not in aliases:
        aliases.append(previous)
    story.slug = slug
    story.slug_aliases = aliases


def _clean_body(value: str | None, *, required: bool) -> str | None:
    text = (value or "").strip()
    if not text:
        if required:
            raise HTTPException(400, "La historia es demasiado corta")
        return None
    if required and len(" ".join(text.split())) < 80:
        raise HTTPException(400, "La historia es demasiado corta")
    return text


def _story_for_cast(db: Session, story_id: str) -> CharacterStory:
    story = db.query(CharacterStory).filter(CharacterStory.id == story_id).first()
    if not story:
        raise HTTPException(404, "Historia no encontrada")
    return story


@router.post("/{story_id}/mentions", response_model=list[StoryRelationOut])
def add_story_appearance(
    story_id: str,
    body: StoryAppearanceIn,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """El Eremita añade un personaje que aparece en la historia."""
    story = _story_for_cast(db, story_id)
    relations = add_appearance(db, story, current_user, body.to_name, body.to_realm)
    db.commit()
    return relations


@router.delete("/{story_id}/mentions", response_model=list[StoryRelationOut])
def remove_story_appearance(
    story_id: str,
    name: str,
    realm: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Quita una etiqueta de aparición puesta por el Eremita. Las relaciones del jugador se quedan."""
    story = _story_for_cast(db, story_id)
    relations = remove_appearance(db, story, name, realm)
    db.commit()
    return relations


@router.post("/{story_id}/body")
def set_story_body(
    story_id: str,
    body: StoryBodyIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Cambia el texto de una historia ya publicada. El enlace no cambia."""
    row = (
        db.query(CharacterStory, User)
        .join(User, User.id == CharacterStory.author_id)
        .filter(CharacterStory.id == story_id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Historia no encontrada")
    story, author = row
    if story.status != "approved":
        raise HTTPException(409, "Solo se puede cambiar el texto de una historia publicada")
    biography = _clean_body(body.biography, required=True)
    personality = _clean_body(body.personality, required=False)
    appearance = _clean_body(body.appearance, required=False)
    changed = (
        biography != story.biography
        or personality != story.personality
        or appearance != story.appearance
    )
    story.biography = biography
    story.personality = personality
    story.appearance = appearance
    if changed:
        notify(
            db,
            user_id=author.id,
            kind="eremita_story",
            title="El Eremita ha actualizado tu historia",
            body=f"El texto de «{story.title}» ya es el nuevo.",
            href=f"/lore/{quote(story.slug or str(story.id), safe='')}",
        )
    db.commit()
    return {
        "biography": story.biography,
        "personality": story.personality,
        "appearance": story.appearance,
    }


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
    _remove_stored_file(story.og_image_url)
    db.delete(story)
    db.commit()
    return Response(status_code=204)
