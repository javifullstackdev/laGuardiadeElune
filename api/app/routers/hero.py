import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.models.hero_slide import HeroSlide
from app.models.character import Character
from app.models.character_story import CharacterStory
from app.schemas.hero import HeroSlideCreate, HeroSlideUpdate, HeroReorder, HeroSlidePublic, HeroSlideAdmin
from app.schemas.character import merge_public_fields
from app.services.bio_questions import has_public_sheet

router = APIRouter(prefix="/hero", tags=["hero"])

FALLBACK_IMAGE = "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1920&q=80"
MAX_SLIDES = 8


def _clamp_focus(value: int | None, default: int) -> int:
    if value is None:
        return default
    return max(0, min(100, int(value)))


def _media(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith("http"):
        return path
    return f"http://localhost:8000/static/{path}"


def _portrait(char: Character, story: CharacterStory | None = None) -> str | None:
    if story and story.cover_url:
        return _media(story.cover_url)
    if char.custom_avatar_url:
        return _media(char.custom_avatar_url)
    return char.render_url


def _excerpt(text: str | None) -> str:
    if not text:
        return ""
    compact = " ".join(text.split())
    return compact[:160].rstrip() + ("…" if len(compact) > 160 else "")


def _resolve(db: Session, slide: HeroSlide) -> HeroSlidePublic | None:
    kind = slide.kind
    src = _media(slide.image_url)
    title = (slide.title or "").strip()
    subtitle = (slide.subtitle or "").strip()
    kicker = (slide.kicker or "").strip()
    href = (slide.href or "").strip()
    cta = (slide.cta_label or "").strip()

    if kind == "story":
        row = (
            db.query(CharacterStory, Character)
            .join(Character, Character.id == CharacterStory.character_id)
            .filter(CharacterStory.id == slide.story_id, CharacterStory.status == "approved")
            .first()
        )
        if not row:
            return None
        story, char = row
        src = src or _portrait(char, story) or FALLBACK_IMAGE
        title = title or story.title
        subtitle = subtitle or _excerpt(story.biography or story.personality or story.appearance)
        kicker = kicker or "Historia"
        href = href or f"/lore/{story.id}"
        cta = cta or "Leer historia"
    elif kind == "character":
        char = (
            db.query(Character)
            .filter(Character.id == slide.character_id, Character.deleted_at.is_(None))
            .first()
        )
        if not char or not has_public_sheet(char):
            return None
        src = src or _portrait(char) or FALLBACK_IMAGE
        display = f"{char.name}{(' ' + char.surname) if char.surname else ''}".strip()
        fields = merge_public_fields(char.public_fields)
        shown_title = None
        if fields.get("title") and char.favorite_title:
            shown_title = char.favorite_title.name
        title = title or display
        subtitle = subtitle or _excerpt(char.biography or char.personality or char.appearance)
        kicker = kicker or shown_title or "Personaje"
        href = href or f"/personajes/{char.realm}/{char.name}"
        cta = cta or "Ver ficha"
    else:
        if not title:
            return None
        src = src or FALLBACK_IMAGE
        kicker = kicker or "Destacado"
        href = href or "#tablon"
        cta = cta or "Ver más"

    return HeroSlidePublic(
        id=slide.id,
        kind=kind,
        src=src,
        kicker=kicker,
        title=title,
        subtitle=subtitle,
        href=href,
        cta=cta,
        focus_x=_clamp_focus(slide.focus_x, 50),
        focus_y=_clamp_focus(slide.focus_y, 28),
    )


def _admin_out(db: Session, slide: HeroSlide) -> HeroSlideAdmin | None:
    resolved = _resolve(db, slide)
    if not resolved:
        return None
    return HeroSlideAdmin(
        **resolved.model_dump(),
        story_id=slide.story_id,
        character_id=slide.character_id,
        image_url=slide.image_url,
        is_active=slide.is_active,
        sort_order=slide.sort_order,
    )


def _find_character(db: Session, body: HeroSlideCreate) -> Character:
    if body.character_id:
        char = db.query(Character).filter(Character.id == body.character_id, Character.deleted_at.is_(None)).first()
    elif body.character_name and body.character_realm:
        char = (
            db.query(Character)
            .filter(
                Character.name == body.character_name,
                Character.realm == body.character_realm,
                Character.deleted_at.is_(None),
            )
            .first()
        )
    else:
        char = None
    if not char:
        raise HTTPException(400, "Personaje no encontrado")
    if not has_public_sheet(char):
        raise HTTPException(400, "Ese personaje aún no tiene ficha pública")
    return char


@router.get("/", response_model=list[HeroSlidePublic])
def list_public(db: Session = Depends(get_db)):
    rows = (
        db.query(HeroSlide)
        .filter(HeroSlide.is_active.is_(True))
        .order_by(HeroSlide.sort_order.asc(), HeroSlide.created_at.asc())
        .all()
    )
    out = []
    for slide in rows:
        resolved = _resolve(db, slide)
        if resolved:
            out.append(resolved)
    return out


@router.get("/admin", response_model=list[HeroSlideAdmin])
def list_admin(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(HeroSlide).order_by(HeroSlide.sort_order.asc(), HeroSlide.created_at.asc()).all()
    out = []
    for slide in rows:
        resolved = _admin_out(db, slide)
        if resolved:
            out.append(resolved)
    return out


@router.post("/", response_model=HeroSlideAdmin, status_code=201)
def create_slide(
    body: HeroSlideCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if body.kind not in ("story", "character", "custom"):
        raise HTTPException(400, "El tipo debe ser story, character o custom")
    count = db.query(HeroSlide).count()
    if count >= MAX_SLIDES:
        raise HTTPException(400, f"El carrusel admite como máximo {MAX_SLIDES} diapositivas")

    story_id = None
    character_id = None
    if body.kind == "story":
        if not body.story_id:
            raise HTTPException(400, "Elige una historia publicada")
        story = (
            db.query(CharacterStory)
            .filter(CharacterStory.id == body.story_id, CharacterStory.status == "approved")
            .first()
        )
        if not story:
            raise HTTPException(400, "Esa historia no está publicada")
        story_id = story.id
    elif body.kind == "character":
        character_id = _find_character(db, body).id
    else:
        if not (body.title or "").strip():
            raise HTTPException(400, "El destacado personalizado necesita un título")

    last = db.query(HeroSlide).order_by(HeroSlide.sort_order.desc()).first()
    slide = HeroSlide(
        id=uuid.uuid4(),
        kind=body.kind,
        story_id=story_id,
        character_id=character_id,
        kicker=(body.kicker or "").strip() or None,
        title=(body.title or "").strip() or None,
        subtitle=(body.subtitle or "").strip() or None,
        image_url=(body.image_url or "").strip() or None,
        href=(body.href or "").strip() or None,
        cta_label=(body.cta_label or "").strip() or None,
        is_active=body.is_active,
        sort_order=(last.sort_order + 1) if last else 0,
        focus_x=_clamp_focus(body.focus_x, 50),
        focus_y=_clamp_focus(body.focus_y, 28 if body.kind in ("story", "character") else 50),
    )
    db.add(slide)
    db.commit()
    db.refresh(slide)
    resolved = _admin_out(db, slide)
    if not resolved:
        raise HTTPException(400, "No se pudo resolver la diapositiva")
    return resolved


@router.patch("/{slide_id}", response_model=HeroSlideAdmin)
def update_slide(
    slide_id: str,
    body: HeroSlideUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    slide = db.query(HeroSlide).filter(HeroSlide.id == slide_id).first()
    if not slide:
        raise HTTPException(404, "Diapositiva no encontrada")
    for field in ("kicker", "title", "subtitle", "image_url", "href", "cta_label"):
        value = getattr(body, field)
        if value is not None:
            setattr(slide, field, value.strip() or None)
    if body.is_active is not None:
        slide.is_active = body.is_active
    if body.sort_order is not None:
        slide.sort_order = body.sort_order
    if body.focus_x is not None:
        slide.focus_x = _clamp_focus(body.focus_x, slide.focus_x)
    if body.focus_y is not None:
        slide.focus_y = _clamp_focus(body.focus_y, slide.focus_y)
    db.commit()
    db.refresh(slide)
    resolved = _admin_out(db, slide)
    if not resolved:
        raise HTTPException(400, "No se pudo resolver la diapositiva")
    return resolved


@router.post("/reorder", response_model=list[HeroSlideAdmin])
def reorder_slides(
    body: HeroReorder,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    slides = {str(s.id): s for s in db.query(HeroSlide).all()}
    for index, slide_id in enumerate(body.ids):
        slide = slides.get(str(slide_id))
        if slide:
            slide.sort_order = index
    db.commit()
    rows = db.query(HeroSlide).order_by(HeroSlide.sort_order.asc(), HeroSlide.created_at.asc()).all()
    out = []
    for slide in rows:
        resolved = _admin_out(db, slide)
        if resolved:
            out.append(resolved)
    return out


@router.delete("/{slide_id}", status_code=204)
def delete_slide(
    slide_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    slide = db.query(HeroSlide).filter(HeroSlide.id == slide_id).first()
    if not slide:
        raise HTTPException(404, "Diapositiva no encontrada")
    db.delete(slide)
    db.commit()
