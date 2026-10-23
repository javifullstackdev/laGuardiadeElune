import uuid as _uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.character import Character
from app.models.image_request import ImageRequest
from app.models.user import User
from app.services.character_images import (
    media_type_for,
    publish_character_image,
    reference_paths,
    upload_file,
)
from app.services.notifications import notify
from app.urls import static_url

router = APIRouter(prefix="/image-requests", tags=["image-requests"])

UPLOAD_DIR = Path("uploads/image_requests")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 8 * 1024 * 1024
MAX_FILES = 6


def _get_own_character(name: str, realm: str, user: User, db: Session) -> Character:
    char = (
        db.query(Character)
        .filter(
            Character.user_id == user.id,
            Character.name == name,
            Character.realm == realm,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not char:
        raise HTTPException(404, "Personaje no encontrado")
    return char


def _out(req: ImageRequest) -> dict:
    char = req.character
    paths = reference_paths(req)
    return {
        "id": str(req.id),
        "kind": req.kind,
        "status": req.status,
        "form_answers": req.form_answers or {},
        "prompt_data": req.prompt_data or {},
        "reference_image_url": static_url(paths[0]) if paths else None,
        "reference_images": [static_url(path) for path in paths],
        "player_notes": req.player_notes,
        "admin_notes": req.admin_notes,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "resolved_at": req.resolved_at.isoformat() if req.resolved_at else None,
        "character": {
            "name": char.name if char else None,
            "realm": char.realm if char else None,
            "game": char.game if char else None,
            "wow_class": char.wow_class.value if char and char.wow_class else None,
            "race": char.race.value if char and char.race else None,
            "gender": char.gender if char else None,
        },
        "owner_username": req.user.username if req.user else None,
    }


async def _save_uploads(char: Character, kind: str, uploads: list[UploadFile]) -> list[str]:
    if not uploads:
        raise HTTPException(400, "Adjunta al menos una captura del juego.")
    if len(uploads) > MAX_FILES:
        raise HTTPException(400, f"Puedes adjuntar hasta {MAX_FILES} capturas.")

    paths: list[str] = []
    written: list[Path] = []
    try:
        for upload in uploads:
            if upload.content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(400, "Solo se permiten imágenes JPEG, PNG o WebP.")
            content = await upload.read()
            if len(content) > MAX_SIZE:
                raise HTTPException(400, "Cada imagen no puede superar 8 MB.")
            ext = (upload.filename or "ref").rsplit(".", 1)[-1].lower()
            if ext not in ("jpg", "jpeg", "png", "webp"):
                ext = "jpg"
            filename = f"{char.id}_{kind}_{_uuid.uuid4().hex}.{ext}"
            filepath = UPLOAD_DIR / filename
            filepath.write_bytes(content)
            written.append(filepath)
            paths.append(f"image_requests/{filename}")
    except HTTPException:
        for path in written:
            path.unlink(missing_ok=True)
        raise
    return paths


def _collect_uploads(
    files: list[UploadFile] | None,
    file: UploadFile | None,
) -> list[UploadFile]:
    uploads = [item for item in (files or []) if item is not None and item.filename]
    if file is not None and file.filename:
        uploads.append(file)
    return uploads


@router.post("", status_code=201)
async def create_image_request(
    name: str = Form(...),
    realm: str = Form(...),
    kind: str = Form(...),
    files: list[UploadFile] | None = File(None),
    file: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Jugador: adjunta capturas in-game (cara o cuerpo) para que el Eremita genere el arte."""
    if kind not in ("face", "full"):
        raise HTTPException(400, "kind debe ser face o full")

    char = _get_own_character(name, realm, current_user, db)
    uploads = _collect_uploads(files, file)
    paths = await _save_uploads(char, kind, uploads)

    existing = (
        db.query(ImageRequest)
        .filter(
            ImageRequest.character_id == char.id,
            ImageRequest.kind == kind,
            ImageRequest.status == "pending",
        )
        .first()
    )
    if existing:
        for old in reference_paths(existing):
            if old not in paths:
                Path("uploads", old).unlink(missing_ok=True)
        existing.reference_image_url = paths[0]
        existing.reference_image_urls = paths
        existing.form_answers = {}
        existing.prompt_data = {}
        existing.player_notes = None
        db.commit()
        db.refresh(existing)
        return _out(existing)

    req = ImageRequest(
        character_id=char.id,
        user_id=current_user.id,
        kind=kind,
        status="pending",
        form_answers={},
        prompt_data={},
        reference_image_url=paths[0],
        reference_image_urls=paths,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _out(req)


@router.get("/mine")
def list_my_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ImageRequest)
        .filter(ImageRequest.user_id == current_user.id)
        .order_by(ImageRequest.created_at.desc())
        .limit(50)
        .all()
    )
    return [_out(r) for r in rows]


@router.get("/pending")
def list_pending(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ImageRequest)
        .filter(ImageRequest.status == "pending")
        .order_by(ImageRequest.created_at.asc())
        .all()
    )
    return [_out(r) for r in rows]


def _get_request(request_id: str, db: Session) -> ImageRequest:
    try:
        rid = _uuid.UUID(request_id)
    except ValueError:
        raise HTTPException(404, "Solicitud no encontrada")
    req = db.query(ImageRequest).filter(ImageRequest.id == rid).first()
    if not req:
        raise HTTPException(404, "Solicitud no encontrada")
    return req


@router.get("/{request_id}/file")
def download_reference(
    request_id: str,
    index: int = 0,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: descarga una captura in-game tal cual la subió el jugador."""
    req = _get_request(request_id, db)
    paths = reference_paths(req)
    if index < 0 or index >= len(paths):
        raise HTTPException(404, "Captura no encontrada")
    path = upload_file(paths[index])
    char_name = req.character.name if req.character else "personaje"
    safe = "".join(ch if ch.isalnum() else "-" for ch in char_name).strip("-") or "personaje"
    filename = f"{safe}-{req.kind}-{index + 1}{path.suffix.lower()}"
    return FileResponse(
        path,
        media_type=media_type_for(path),
        filename=filename,
        content_disposition_type="attachment",
    )


class ResolveBody(BaseModel):
    status: str
    admin_notes: str | None = None


@router.post("/{request_id}/resolve")
def resolve_request(
    request_id: str,
    body: ResolveBody,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: marca como done o rejected."""
    if body.status not in ("done", "rejected"):
        raise HTTPException(400, "status debe ser done o rejected")

    req = _get_request(request_id, db)
    if req.status != "pending":
        raise HTTPException(400, "La solicitud ya está resuelta")

    req.status = body.status
    req.admin_notes = body.admin_notes
    req.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)
    return _out(req)


@router.post("/{request_id}/publish")
async def publish_art(
    request_id: str,
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: sube el arte generado y lo publica en el personaje."""
    req = _get_request(request_id, db)
    if req.status != "pending":
        raise HTTPException(400, "La solicitud ya está resuelta")
    char = req.character
    if not char:
        raise HTTPException(404, "Personaje no encontrado")

    await publish_character_image(char, file, req.kind)
    req.status = "done"
    req.resolved_at = datetime.now(timezone.utc)

    label = "la foto de cara" if req.kind == "face" else "la imagen"
    href = "/profile"
    if char.bio_status == "published":
        href = f"/personajes/{quote(char.realm, safe='')}/{quote(char.name, safe='')}"
    notify(
        db,
        user_id=char.user_id,
        kind="eremita_bio",
        title=f"El Eremita ha publicado {label} de {char.name}",
        body="Ya se ve en tu personaje.",
        href=href,
    )
    db.commit()
    db.refresh(req)
    return _out(req)
