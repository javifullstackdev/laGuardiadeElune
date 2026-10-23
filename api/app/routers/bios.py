from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.character import Character
from app.models.image_request import ImageRequest
from app.models.user import User
from app.schemas.bio import (
    BioAnswerView,
    BioPendingOut,
    BioPublishedOut,
    BioQuestionOut,
    BioReferenceImage,
    BioRejectIn,
)
from app.services.bio_questions import QUESTIONS, formatted_answers, has_public_sheet
from app.services.character_images import publish_character_image, reference_paths
from app.services.notifications import notify
from app.urls import static_url

router = APIRouter(prefix="/bios", tags=["bios"])


def _cover(char: Character) -> str | None:
    """Arte de ficha: imagen completa custom > render (nunca la cara del ranking)."""
    if char.custom_avatar_url:
        return static_url(char.custom_avatar_url)
    return char.render_url


def _face(char: Character) -> str | None:
    """Cara pública: propia aprobada > cara de Battle.net."""
    if char.custom_face_url:
        return static_url(char.custom_face_url)
    return char.face_url


def _reference_views(reqs: list[ImageRequest]) -> list[BioReferenceImage]:
    views: list[BioReferenceImage] = []
    for req in reqs:
        for index, path in enumerate(reference_paths(req)):
            url = static_url(path)
            if not url:
                continue
            views.append(
                BioReferenceImage(
                    request_id=req.id,
                    kind=req.kind,
                    index=index,
                    url=url,
                )
            )
    return views


def _pending_out(
    char: Character,
    author: User,
    refs: list[ImageRequest] | None = None,
) -> BioPendingOut:
    return BioPendingOut(
        character_id=char.id,
        character_name=char.name,
        character_realm=char.realm,
        author_username=author.username,
        cover_url=_cover(char),
        answers=[BioAnswerView(**row) for row in formatted_answers(char.bio_answers)],
        reference_images=_reference_views(refs or []),
        submitted_at=char.bio_submitted_at,
        bio_status=char.bio_status,
        current_biography=char.biography,
        current_personality=char.personality,
        current_appearance=char.appearance,
    )


def _published_out(char: Character, author: User) -> BioPublishedOut:
    return BioPublishedOut(
        character_id=char.id,
        character_name=char.name,
        character_realm=char.realm,
        author_username=author.username,
        cover_url=_cover(char),
        face_url=_face(char),
        biography=char.biography,
        personality=char.personality,
        appearance=char.appearance,
    )


def _pending_refs(db: Session, character_ids: list) -> dict:
    if not character_ids:
        return {}
    rows = (
        db.query(ImageRequest)
        .filter(
            ImageRequest.character_id.in_(character_ids),
            ImageRequest.status == "pending",
        )
        .order_by(ImageRequest.created_at.asc())
        .all()
    )
    grouped: dict = {}
    for req in rows:
        grouped.setdefault(req.character_id, []).append(req)
    return grouped


def _close_requests(db: Session, char: Character, kind: str) -> None:
    now = datetime.now(timezone.utc)
    rows = (
        db.query(ImageRequest)
        .filter(
            ImageRequest.character_id == char.id,
            ImageRequest.kind == kind,
            ImageRequest.status == "pending",
        )
        .all()
    )
    for req in rows:
        req.status = "done"
        req.resolved_at = now


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
    refs = _pending_refs(db, [char.id for char, _author in rows])
    return [_pending_out(char, author, refs.get(char.id, [])) for char, author in rows]


@router.get("/published", response_model=list[BioPublishedOut])
def list_published(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Fichas ya públicas, para corregir texto e imagen."""
    rows = (
        db.query(Character, User)
        .join(User, User.id == Character.user_id)
        .filter(
            Character.deleted_at.is_(None),
            Character.bio_status == "published",
        )
        .order_by(Character.name.asc())
        .all()
    )
    return [_published_out(char, author) for char, author in rows]


@router.post("/{character_id}/publish", response_model=BioPendingOut)
async def publish_bio(
    character_id: str,
    biography: str = Form(...),
    personality: str | None = Form(None),
    appearance: str | None = Form(None),
    full_file: UploadFile | None = File(None),
    face_file: UploadFile | None = File(None),
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
    text = (biography or "").strip()
    if len(text) < 40:
        raise HTTPException(400, "La biografía es demasiado corta")
    published_image = False
    if full_file is not None and full_file.filename:
        await publish_character_image(char, full_file, "full")
        _close_requests(db, char, "full")
        published_image = True
    if face_file is not None and face_file.filename:
        await publish_character_image(char, face_file, "face")
        _close_requests(db, char, "face")
        published_image = True
    char.biography = text
    char.personality = (personality or "").strip() or None
    char.appearance = (appearance or "").strip() or None
    char.bio_status = "published"
    char.bio_answers_pending = False
    char.bio_rejection_reason = None
    notice = f"La biografía de {char.name} ya es pública."
    if published_image:
        notice = f"La ficha de {char.name} ya es pública, con la imagen del personaje."
    notify(
        db,
        user_id=author.id,
        kind="eremita_bio",
        title="El Eremita ha publicado tu ficha",
        body=notice,
        href=f"/personajes/{quote(char.realm, safe='')}/{quote(char.name, safe='')}",
    )
    db.commit()
    db.refresh(char)
    return _pending_out(char, author, _pending_refs(db, [char.id]).get(char.id, []))


@router.post("/{character_id}/update", response_model=BioPublishedOut)
async def update_published_bio(
    character_id: str,
    biography: str = Form(...),
    personality: str | None = Form(None),
    appearance: str | None = Form(None),
    full_file: UploadFile | None = File(None),
    face_file: UploadFile | None = File(None),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: corrige el texto o el retrato de una ficha que ya es pública."""
    row = (
        db.query(Character, User)
        .join(User, User.id == Character.user_id)
        .filter(Character.id == character_id, Character.deleted_at.is_(None))
        .first()
    )
    if not row:
        raise HTTPException(404, "Personaje no encontrado")
    char, author = row
    if char.bio_status != "published":
        raise HTTPException(409, "Esta ficha aún no está publicada")
    text = (biography or "").strip()
    if len(text) < 40:
        raise HTTPException(400, "La biografía es demasiado corta")
    replaced_image = False
    if full_file is not None and full_file.filename:
        await publish_character_image(char, full_file, "full")
        _close_requests(db, char, "full")
        replaced_image = True
    if face_file is not None and face_file.filename:
        await publish_character_image(char, face_file, "face")
        _close_requests(db, char, "face")
        replaced_image = True
    char.biography = text
    char.personality = (personality or "").strip() or None
    char.appearance = (appearance or "").strip() or None
    notice = f"El texto de {char.name} ya está actualizado."
    if replaced_image:
        notice = f"La ficha de {char.name} ya tiene el texto y la imagen nuevos."
    notify(
        db,
        user_id=author.id,
        kind="eremita_bio",
        title="El Eremita ha actualizado tu ficha",
        body=notice,
        href=f"/personajes/{quote(char.realm, safe='')}/{quote(char.name, safe='')}",
    )
    db.commit()
    db.refresh(char)
    return _published_out(char, author)


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
    reason = char.bio_rejection_reason
    if char.bio_status == "published":
        title = "El Eremita ha respondido a tu ficha"
        body = f"No ha incorporado los cambios de {char.name}."
    else:
        title = "El Eremita ha devuelto tu ficha"
        body = f"El cuestionario de {char.name} vuelve a borrador."
    if reason:
        body = f"{body} {reason}"
    notify(
        db,
        user_id=author.id,
        kind="eremita_bio",
        title=title,
        body=body,
    )
    db.commit()
    db.refresh(char)
    return _pending_out(char, author, _pending_refs(db, [char.id]).get(char.id, []))
