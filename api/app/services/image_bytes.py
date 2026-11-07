"""Lectura de imágenes subidas. La extensión sale de los bytes, no del tipo que declara el navegador."""

from fastapi import HTTPException, UploadFile

_JPEG = b"\xff\xd8\xff"
_PNG = b"\x89PNG\r\n\x1a\n"


def image_kind(content: bytes) -> str | None:
    if content.startswith(_JPEG):
        return "jpg"
    if content.startswith(_PNG):
        return "png"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return None


async def read_image(file: UploadFile, *, max_bytes: int, too_big: str) -> tuple[bytes, str]:
    content = await file.read(max_bytes + 1)
    if not content:
        raise HTTPException(400, "La imagen está vacía")
    if len(content) > max_bytes:
        raise HTTPException(400, too_big)
    kind = image_kind(content)
    if kind is None:
        raise HTTPException(400, "La imagen debe ser JPEG, PNG o WebP")
    return content, kind
