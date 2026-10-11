import json
import uuid as _uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.character import Character
from app.models.image_request import ImageRequest
from app.models.user import User
from app.services.image_prompt import build_image_prompt_data
from app.urls import static_url

router = APIRouter(prefix="/image-requests", tags=["image-requests"])

UPLOAD_DIR = Path("uploads/image_requests")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 8 * 1024 * 1024


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
    return {
        "id": str(req.id),
        "kind": req.kind,
        "status": req.status,
        "form_answers": req.form_answers or {},
        "prompt_data": req.prompt_data or {},
        "reference_image_url": static_url(req.reference_image_url),
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


@router.post("", status_code=201)
async def create_image_request(
    name: str = Form(...),
    realm: str = Form(...),
    kind: str = Form(...),
    answers_json: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Jugador: solicita generación de imagen (cara o completa)."""
    if kind not in ("face", "full"):
        raise HTTPException(400, "kind debe ser face o full")

    char = _get_own_character(name, realm, current_user, db)

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
        raise HTTPException(400, "Ya tienes una solicitud pendiente de este tipo para este personaje.")

    try:
        answers = json.loads(answers_json)
        if not isinstance(answers, dict):
            raise ValueError("answers must be object")
    except Exception:
        raise HTTPException(400, "answers_json inválido")

    # Solo la captura es obligatoria; el formulario son ajustes opcionales.
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Solo se permiten imágenes JPEG, PNG o WebP.")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "La imagen no puede superar 8 MB.")

    ext = (file.filename or "ref").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    filename = f"{char.id}_{kind}_{_uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    with filepath.open("wb") as f:
        f.write(content)

    prompt = build_image_prompt_data(kind, answers)
    req = ImageRequest(
        character_id=char.id,
        user_id=current_user.id,
        kind=kind,
        status="pending",
        form_answers=answers,
        prompt_data=prompt,
        reference_image_url=f"image_requests/{filename}",
        player_notes=(answers.get("extra_notes") or None),
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

    req = db.query(ImageRequest).filter(ImageRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Solicitud no encontrada")
    if req.status != "pending":
        raise HTTPException(400, "La solicitud ya está resuelta")

    req.status = body.status
    req.admin_notes = body.admin_notes
    req.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)
    return _out(req)
