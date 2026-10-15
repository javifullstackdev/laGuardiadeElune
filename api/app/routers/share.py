import hashlib
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from PIL import Image, ImageOps

router = APIRouter()

UPLOAD_ROOT = Path("uploads").resolve()
CACHE_DIR = UPLOAD_ROOT / "_share"
SOURCE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# WhatsApp descarta las vistas previas con imágenes pesadas; apuntamos a menos de ~300 KB.
MAX_SIDE = 1200
TARGET_BYTES = 280 * 1024
QUALITIES = (82, 72, 62, 50)
FLAT_BACKGROUND = (11, 11, 11)


def _render(source: Path, target: Path) -> None:
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        if image.mode in ("RGBA", "LA", "P"):
            rgba = image.convert("RGBA")
            image = Image.new("RGB", rgba.size, FLAT_BACKGROUND)
            image.paste(rgba, mask=rgba.getchannel("A"))
        else:
            image = image.convert("RGB")
        image.thumbnail((MAX_SIDE, MAX_SIDE))

        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.parent / f".{uuid.uuid4().hex}.tmp"
        try:
            for quality in QUALITIES:
                image.save(tmp, "JPEG", quality=quality, optimize=True, progressive=True)
                if tmp.stat().st_size <= TARGET_BYTES:
                    break
            tmp.replace(target)
        finally:
            tmp.unlink(missing_ok=True)


@router.get("/static/share/{file_path:path}")
def share_image(file_path: str):
    source = (UPLOAD_ROOT / file_path).resolve()
    inside_uploads = UPLOAD_ROOT in source.parents and CACHE_DIR not in source.parents
    if not inside_uploads or source.suffix.lower() not in SOURCE_EXTENSIONS or not source.is_file():
        raise HTTPException(404, "Imagen no encontrada")

    key = hashlib.sha1(f"{file_path}:{source.stat().st_mtime_ns}".encode()).hexdigest()
    target = CACHE_DIR / f"{key}.jpg"
    if not target.exists():
        try:
            _render(source, target)
        except (OSError, ValueError, Image.DecompressionBombError):
            raise HTTPException(404, "Imagen no encontrada")

    return FileResponse(
        target,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
