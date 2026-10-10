"""Public URL helpers for uploads and absolute links."""
from __future__ import annotations

import os


def public_base_url() -> str:
    """
    Origin reachable by browsers.
    Local: http://localhost:8000
    Prod (Caddy): https://www.laguardiadeelune.com
    """
    return os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")


def static_url(path: str | None) -> str | None:
    """Build an absolute /static/... URL, or pass through if already absolute."""
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{public_base_url()}/static/{path.lstrip('/')}"
