import re
import unicodedata
from uuid import UUID

MAX_SLUG_LENGTH = 80
RESERVED_SLUGS = {"pending", "mine", "submit", "new", "edit"}


def slugify(text: str | None, fallback: str = "contenido") -> str:
    normalized = unicodedata.normalize("NFKD", text or "")
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    if len(slug) > MAX_SLUG_LENGTH:
        slug = slug[:MAX_SLUG_LENGTH].rsplit("-", 1)[0] or slug[:MAX_SLUG_LENGTH]
    return slug or fallback


def is_uuid(value: str) -> bool:
    try:
        UUID(value)
    except (ValueError, AttributeError, TypeError):
        return False
    return True


def _slug_taken(db, model, candidate: str, exclude_id=None) -> bool:
    if candidate in RESERVED_SLUGS:
        return True
    query = db.query(model.id).filter(model.slug == candidate)
    if exclude_id is not None:
        query = query.filter(model.id != exclude_id)
    if query.first() is not None:
        return True
    aliases = getattr(model, "slug_aliases", None)
    if aliases is None:
        return False
    query = db.query(model.id).filter(aliases.any(candidate))
    if exclude_id is not None:
        query = query.filter(model.id != exclude_id)
    return query.first() is not None


def unique_slug(db, model, title: str | None, fallback: str = "contenido", exclude_id=None) -> str:
    base = slugify(title, fallback)
    candidate = base
    suffix = 2
    while _slug_taken(db, model, candidate, exclude_id):
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate
