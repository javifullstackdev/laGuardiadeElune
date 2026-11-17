import hashlib
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from PIL import Image, ImageOps

router = APIRouter()

UPLOAD_ROOT = Path("uploads").resolve()
CACHE_DIR = UPLOAD_ROOT / "_share"
ONCE_DIR = UPLOAD_ROOT / "_once"
SOURCE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

# WhatsApp descarta las vistas previas con imágenes pesadas; apuntamos a menos de ~300 KB.
MAX_SIDE = 1200
TARGET_BYTES = 280 * 1024
QUALITIES = (82, 72, 62, 50)
FLAT_BACKGROUND = (11, 11, 11)


def _render(source: Path, target: Path) -> None:
    with Image.open(source) as original:
        if getattr(original, "is_animated", False):
            original.seek(0)
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


def _subblocks_end(data: bytes, index: int) -> int:
    while index < len(data):
        size = data[index]
        index += 1 + size
        if size == 0:
            return index
    return index


def gif_play_once(data: bytes) -> bytes:
    """Quita el bucle de Netscape. El navegador reproduce el GIF una vez y se queda en el último fotograma."""
    if len(data) < 13 or data[:6] not in (b"GIF87a", b"GIF89a"):
        return data
    packed = data[10]
    index = 13
    if packed & 0x80:
        index += 3 * (1 << ((packed & 7) + 1))
    if index > len(data):
        return data
    out = bytearray(data[:index])
    while index < len(data):
        kind = data[index]
        if kind == 0x3B:
            out.append(kind)
            break
        if kind == 0x21 and index + 2 < len(data):
            if data[index + 1] == 0xFF:
                size = data[index + 2]
                ident = data[index + 3 : index + 3 + size]
                end = _subblocks_end(data, index + 3 + size)
                if ident != b"NETSCAPE2.0":
                    out.extend(data[index:end])
                index = end
                continue
            end = _subblocks_end(data, index + 2)
            out.extend(data[index:end])
            index = end
            continue
        if kind == 0x2C and index + 10 <= len(data):
            image_packed = data[index + 9]
            cursor = index + 10
            if image_packed & 0x80:
                cursor += 3 * (1 << ((image_packed & 7) + 1))
            if cursor >= len(data):
                break
            end = _subblocks_end(data, cursor + 1)
            out.extend(data[index:end])
            index = end
            continue
        out.extend(data[index:])
        break
    return bytes(out)


@router.get("/static/once/{file_path:path}")
def once_gif(file_path: str):
    source = (UPLOAD_ROOT / file_path).resolve()
    inside_uploads = UPLOAD_ROOT in source.parents and ONCE_DIR not in source.parents and CACHE_DIR not in source.parents
    if not inside_uploads or source.suffix.lower() != ".gif" or not source.is_file():
        raise HTTPException(404, "Imagen no encontrada")

    key = hashlib.sha1(f"{file_path}:{source.stat().st_mtime_ns}".encode()).hexdigest()
    target = ONCE_DIR / f"{key}.gif"
    if not target.exists():
        try:
            rendered = gif_play_once(source.read_bytes())
        except OSError:
            raise HTTPException(404, "Imagen no encontrada")
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.parent / f".{uuid.uuid4().hex}.tmp"
        try:
            tmp.write_bytes(rendered)
            tmp.replace(target)
        finally:
            tmp.unlink(missing_ok=True)

    return FileResponse(
        target,
        media_type="image/gif",
        headers={"Cache-Control": "public, max-age=86400"},
    )
