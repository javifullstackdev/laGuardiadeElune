"""Lectura de imágenes subidas. La extensión sale de los bytes, no del tipo que declara el navegador."""

from fastapi import HTTPException, UploadFile

_JPEG = b"\xff\xd8\xff"
_PNG = b"\x89PNG\r\n\x1a\n"
_GIF = (b"GIF87a", b"GIF89a")

# Un GIF animado pesa más que la misma escena en JPEG. Las imágenes fijas siguen en su tope.
GIF_MAX_BYTES = 12 * 1024 * 1024


def image_kind(content: bytes) -> str | None:
    if content.startswith(_JPEG):
        return "jpg"
    if content.startswith(_PNG):
        return "png"
    if content[:6] in _GIF:
        return "gif"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return None


async def read_image(file: UploadFile, *, max_bytes: int, too_big: str) -> tuple[bytes, str]:
    ceiling = max(max_bytes, GIF_MAX_BYTES)
    content = await file.read(ceiling + 1)
    if not content:
        raise HTTPException(400, "La imagen está vacía")
    kind = image_kind(content)
    if kind is None:
        raise HTTPException(400, "La imagen debe ser JPEG, PNG, WebP o GIF")
    limit = GIF_MAX_BYTES if kind == "gif" else max_bytes
    if len(content) > limit:
        if kind == "gif":
            raise HTTPException(400, "El GIF no puede superar 12 MB")
        raise HTTPException(400, too_big)
    return content, kind
