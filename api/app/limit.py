"""Límite de envíos. La clave es la persona, no la IP del servidor de Next."""

import time

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.dependencies import JWT_ALGORITHM, JWT_SECRET

_WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_WRITE_LIMIT = 60
_WRITE_WINDOW = 60.0
_AUTH_LIMIT = 10
_AUTH_WINDOW = 600.0

# key -> (inicio de la ventana, recuento)
_buckets: dict[str, tuple[float, int]] = {}


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    parts = [part.strip() for part in forwarded.split(",") if part.strip()]
    if parts:
        return parts[-1]
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _subject(request: Request) -> str | None:
    header = request.headers.get("authorization") or ""
    token = header[7:] if header.lower().startswith("bearer ") else request.cookies.get("token")
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None
    subject = payload.get("sub")
    return str(subject) if subject else None


def allow(key: str, limit: int, window: float) -> bool:
    now = time.monotonic()
    start, count = _buckets.get(key, (now, 0))
    if now - start >= window:
        start, count = now, 0
    count += 1
    _buckets[key] = (start, count)
    if len(_buckets) > 5000:
        stale = [name for name, (opened, _) in _buckets.items() if now - opened >= _AUTH_WINDOW]
        for name in stale:
            _buckets.pop(name, None)
    return count <= limit


class WriteLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method.upper()
        if method == "GET" and path == "/auth/discord/callback":
            if not allow(f"auth:{client_ip(request)}", _AUTH_LIMIT, _AUTH_WINDOW):
                return JSONResponse(
                    {"detail": "Demasiados intentos de entrada. Espera un momento."},
                    status_code=429,
                )
        elif method in _WRITE_METHODS:
            who = _subject(request) or client_ip(request)
            if not allow(f"write:{who}", _WRITE_LIMIT, _WRITE_WINDOW):
                return JSONResponse(
                    {"detail": "Demasiados envíos. Espera un momento."},
                    status_code=429,
                )
        return await call_next(request)
