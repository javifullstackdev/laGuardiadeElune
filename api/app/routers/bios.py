from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.character import Character
from app.models.character_story import CharacterStory
from app.models.image_request import ImageRequest
from app.models.user import User
from app.schemas.bio import (
    BioAnswerView,
    BioPendingOut,
    BioPublishedOut,
    BioQuestionOut,
    BioReferenceImage,
    BioSheetImage,
    BioStoryImage,
    BioRejectIn,
    SurnameDecisionIn,
    SurnameReviewOut,
)
from app.services.bio_questions import QUESTIONS, formatted_answers, has_public_sheet
from app.services.character_images import (
    SHEET_SLOTS,
    media_type_for,
    publish_character_image,
    reference_paths,
    store_still_image,
    upload_file,
)
from app.services.missions import grant_ready
from app.services.notifications import notify
from app.urls import profile_href, static_url

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


def _sheet_views(char: Character) -> list[BioSheetImage]:
    views: list[BioSheetImage] = []
    for slot, (column, label) in SHEET_SLOTS.items():
        url = static_url(getattr(char, column))
        if not url:
            continue
        views.append(BioSheetImage(slot=slot, label=label, url=url))
    return views


def _story_images(db: Session, character_ids: list) -> dict:
    """Portadas que el jugador subió en sus historias. No incluye el retrato de respaldo."""
    if not character_ids:
        return {}
    rows = (
        db.query(CharacterStory)
        .filter(
            CharacterStory.character_id.in_(character_ids),
            CharacterStory.cover_url.isnot(None),
            CharacterStory.cover_url != "",
        )
        .order_by(CharacterStory.submitted_at.desc())
        .all()
    )
    grouped: dict = {}
    for story in rows:
        if not story.cover_url or story.cover_url.startswith("http"):
            continue
        url = static_url(story.cover_url)
        if not url:
            continue
        grouped.setdefault(story.character_id, []).append(
            BioStoryImage(
                story_id=story.id,
                title=story.title,
                status=story.status,
                url=url,
            )
        )
    return grouped


def _file_name(name: str, label: str, suffix: str) -> str:
    def clean(value: str) -> str:
        text = "".join(ch if ch.isalnum() else "-" for ch in value)
        while "--" in text:
            text = text.replace("--", "-")
        return text.strip("-") or "archivo"
    return f"{clean(name)}-{clean(label)}{suffix}"


def _admin_character(db: Session, character_id: str) -> Character:
    char = (
        db.query(Character)
        .filter(Character.id == character_id, Character.deleted_at.is_(None))
        .first()
    )
    if not char:
        raise HTTPException(404, "Personaje no encontrado")
    return char


def _pending_out(
    char: Character,
    author: User,
    refs: list[ImageRequest] | None = None,
    story_images: list[BioStoryImage] | None = None,
) -> BioPendingOut:
    return BioPendingOut(
        character_id=char.id,
        character_name=char.name,
        character_realm=char.realm,
        author_username=author.username,
        game=char.game or "retail",
        surname=(char.surname or "").strip() or None,
        surname_allowed=bool(char.surname_allowed),
        cover_url=_cover(char),
        answers=[BioAnswerView(**row) for row in formatted_answers(char.bio_answers)],
        reference_images=_reference_views(refs or []),
        sheet_images=_sheet_views(char),
        story_images=story_images or [],
        submitted_at=char.bio_submitted_at,
        bio_status=char.bio_status,
        current_biography=char.biography,
        current_personality=char.personality,
        current_appearance=char.appearance,
    )


def _published_out(
    char: Character,
    author: User,
    story_images: list[BioStoryImage] | None = None,
) -> BioPublishedOut:
    return BioPublishedOut(
        character_id=char.id,
        character_name=char.name,
        character_realm=char.realm,
        author_username=author.username,
        game=char.game or "retail",
        surname=(char.surname or "").strip() or None,
        surname_allowed=bool(char.surname_allowed),
        cover_url=_cover(char),
        face_url=_face(char),
        carousel_image_url=static_url(char.carousel_image_url),
        og_image_url=static_url(char.og_image_url),
        biography=char.biography,
        personality=char.personality,
        appearance=char.appearance,
        sheet_images=_sheet_views(char),
        story_images=story_images or [],
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
    ids = [char.id for char, _author in rows]
    refs = _pending_refs(db, ids)
    covers = _story_images(db, ids)
    return [
        _pending_out(char, author, refs.get(char.id, []), covers.get(char.id, []))
        for char, author in rows
    ]


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
    covers = _story_images(db, [char.id for char, _author in rows])
    return [_published_out(char, author, covers.get(char.id, [])) for char, author in rows]


@router.get("/{character_id}/sheet/{slot}/file")
def download_sheet_image(
    character_id: str,
    slot: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: descarga una captura de la ficha tal como la subió el jugador."""
    found = SHEET_SLOTS.get(slot)
    if found is None:
        raise HTTPException(404, "Esa imagen no forma parte de la ficha")
    column, label = found
    char = _admin_character(db, character_id)
    relative = getattr(char, column)
    if not relative:
        raise HTTPException(404, "El jugador no ha subido esa imagen")
    path = upload_file(relative)
    return FileResponse(
        path,
        media_type=media_type_for(path),
        filename=_file_name(char.name, label, path.suffix.lower()),
        content_disposition_type="attachment",
    )


@router.get("/{character_id}/stories/{story_id}/cover")
def download_story_cover(
    character_id: str,
    story_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: descarga la portada que el jugador subió con la historia."""
    char = _admin_character(db, character_id)
    story = (
        db.query(CharacterStory)
        .filter(
            CharacterStory.id == story_id,
            CharacterStory.character_id == char.id,
        )
        .first()
    )
    if not story or not story.cover_url or story.cover_url.startswith("http"):
        raise HTTPException(404, "Esta historia no tiene una portada subida")
    path = upload_file(story.cover_url)
    return FileResponse(
        path,
        media_type=media_type_for(path),
        filename=_file_name(char.name, story.title, path.suffix.lower()),
        content_disposition_type="attachment",
    )


@router.post("/{character_id}/surname", response_model=SurnameReviewOut)
def decide_surname(
    character_id: str,
    body: SurnameDecisionIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: el apellido se muestra solo si lo da por válido."""
    row = (
        db.query(Character, User)
        .join(User, User.id == Character.user_id)
        .filter(Character.id == character_id, Character.deleted_at.is_(None))
        .first()
    )
    if not row:
        raise HTTPException(404, "Personaje no encontrado")
    char, author = row
    if not (char.surname or "").strip():
        raise HTTPException(400, "Este personaje no tiene apellido")
    if char.game == "forever":
        raise HTTPException(400, "En Forever el apellido se muestra siempre")
    char.surname_allowed = body.allowed
    if body.allowed:
        title = f"El Eremita ha aceptado el apellido de {char.name}"
        notice = "Ya se muestra en la ficha."
    else:
        title = f"El Eremita ha ocultado el apellido de {char.name}"
        notice = "No se muestra en público. Puedes cambiarlo en tu perfil."
    notify(
        db,
        user_id=author.id,
        kind="eremita_bio",
        title=title,
        body=notice,
        href="/profile",
    )
    db.commit()
    db.refresh(char)
    return SurnameReviewOut(
        character_id=char.id,
        character_name=char.name,
        character_realm=char.realm,
        author_username=author.username,
        surname=char.surname,
        surname_allowed=bool(char.surname_allowed),
    )


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
    grant_ready(db, author)
    db.commit()
    db.refresh(char)
    return _pending_out(
        char,
        author,
        _pending_refs(db, [char.id]).get(char.id, []),
        _story_images(db, [char.id]).get(char.id, []),
    )


@router.post("/{character_id}/update", response_model=BioPublishedOut)
async def update_published_bio(
    character_id: str,
    biography: str = Form(...),
    personality: str | None = Form(None),
    appearance: str | None = Form(None),
    full_file: UploadFile | None = File(None),
    face_file: UploadFile | None = File(None),
    carousel_file: UploadFile | None = File(None),
    og_file: UploadFile | None = File(None),
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
    if carousel_file is not None and carousel_file.filename:
        await store_still_image(char, carousel_file, "carousel_image_url")
        replaced_image = True
    if og_file is not None and og_file.filename:
        await store_still_image(char, og_file, "og_image_url")
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
    return _published_out(char, author, _story_images(db, [char.id]).get(char.id, []))


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
    reason = (body.reason or "").strip()
    if not reason:
        raise HTTPException(400, "Escribe qué tiene que cambiar")
    public = has_public_sheet(char)
    char.bio_answers_pending = False
    char.bio_rejection_reason = reason
    if not public:
        char.bio_status = "draft"
    title = "El Eremita te pide cambios en la ficha"
    if public:
        notice = f"La ficha pública de {char.name} sigue igual. {reason} Corrígelo en tu perfil y vuelve a enviarla."
    else:
        notice = f"La ficha de {char.name} vuelve a borrador. {reason} Corrígelo y vuelve a enviarla."
    notify(
        db,
        user_id=author.id,
        kind="eremita_bio",
        title=title,
        body=notice,
        href=profile_href(section="bio", name=char.name, realm=char.realm),
    )
    db.commit()
    db.refresh(char)
    return _pending_out(
        char,
        author,
        _pending_refs(db, [char.id]).get(char.id, []),
        _story_images(db, [char.id]).get(char.id, []),
    )


@router.post("/{character_id}/decline", response_model=BioPendingOut)
def decline_bio(
    character_id: str,
    body: BioRejectIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: rechaza la ficha. El jugador lo ve en el buzón y puede reescribirla."""
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
    reason = (body.reason or "").strip()
    if not reason:
        raise HTTPException(400, "Escribe por qué rechazas la ficha")
    public = has_public_sheet(char)
    char.bio_answers_pending = False
    char.bio_rejection_reason = reason
    if public:
        title = "El Eremita ha rechazado los cambios de la ficha"
        notice = f"La ficha pública de {char.name} sigue igual. {reason} Puedes corregirla y enviarla de nuevo."
    else:
        char.bio_status = "rejected"
        title = "El Eremita ha rechazado la ficha"
        notice = f"{char.name} no se publica. {reason} Puedes reescribirla y enviarla de nuevo."
    notify(
        db,
        user_id=author.id,
        kind="eremita_bio",
        title=title,
        body=notice,
        href=profile_href(section="bio", name=char.name, realm=char.realm),
    )
    db.commit()
    db.refresh(char)
    return _pending_out(
        char,
        author,
        _pending_refs(db, [char.id]).get(char.id, []),
        _story_images(db, [char.id]).get(char.id, []),
    )
