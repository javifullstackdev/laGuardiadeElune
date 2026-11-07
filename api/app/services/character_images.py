"""Retratos que publica el Eremita y lectura segura de archivos subidos."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.models.character import Character
from app.models.image_request import ImageRequest
from app.services.image_bytes import read_image

UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
SHEET_DIR = Path("uploads/sheet")
SHEET_DIR.mkdir(parents=True, exist_ok=True)

# slot → (columna, etiqueta que ve el jugador y el Eremita)
SHEET_SLOTS = {
    "front": ("sheet_front_url", "Cuerpo completo, de frente"),
    "back": ("sheet_back_url", "Cuerpo completo, de espaldas"),
    "face": ("sheet_face_url", "Rostro"),
}
UPLOAD_ROOT = Path("uploads").resolve()

MAX_IMAGE_SIZE = 8 * 1024 * 1024

MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def reference_paths(req: ImageRequest) -> list[str]:
    raw = req.reference_image_urls or []
    paths = [path for path in raw if isinstance(path, str) and path.strip()]
    if paths:
        return paths
    if req.reference_image_url:
        return [req.reference_image_url]
    return []


def upload_file(relative: str) -> Path:
    path = (UPLOAD_ROOT / relative).resolve()
    if UPLOAD_ROOT not in path.parents or not path.is_file():
        raise HTTPException(404, "Archivo no encontrado")
    return path


def media_type_for(path: Path) -> str:
    return MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")


def _unlink(relative: str | None) -> None:
    if not relative:
        return
    target = UPLOAD_ROOT / relative
    target.unlink(missing_ok=True)


def sheet_images_ready(char: Character) -> bool:
    return all(getattr(char, column) for column, _label in SHEET_SLOTS.values())


async def store_sheet_image(char: Character, file: UploadFile, slot: str) -> str:
    """Guarda una captura in-game de la ficha. No la publica en el pergamino."""
    found = SHEET_SLOTS.get(slot)
    if found is None:
        raise HTTPException(400, "Esa imagen no forma parte de la ficha")
    column, _label = found
    content, ext = await read_image(
        file, max_bytes=MAX_IMAGE_SIZE, too_big="La imagen no puede superar 8 MB."
    )
    filename = f"sheet_{slot}_{char.id}_{uuid.uuid4().hex}.{ext}"
    (SHEET_DIR / filename).write_bytes(content)
    relative = f"sheet/{filename}"
    _unlink(getattr(char, column))
    setattr(char, column, relative)
    return relative


async def publish_character_image(char: Character, file: UploadFile, kind: str) -> str:
    """Guarda el arte generado y lo deja público en la ficha (full) o en el ranking (face)."""
    if kind not in ("face", "full"):
        raise HTTPException(400, "kind debe ser face o full")
    content, ext = await read_image(
        file, max_bytes=MAX_IMAGE_SIZE, too_big="La imagen no puede superar 8 MB."
    )
    filename = f"art_{kind}_{char.id}_{uuid.uuid4().hex}.{ext}"
    (UPLOAD_DIR / filename).write_bytes(content)
    relative = f"avatars/{filename}"

    if kind == "face":
        _unlink(char.custom_face_url)
        _unlink(char.pending_face_url)
        char.custom_face_url = relative
        char.pending_face_url = None
    else:
        _unlink(char.custom_avatar_url)
        _unlink(char.pending_avatar_url)
        char.custom_avatar_url = relative
        char.pending_avatar_url = None
    return relative
