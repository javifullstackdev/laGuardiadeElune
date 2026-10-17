"""Cliente de la API de Blizzard para datos públicos (credenciales de aplicación)."""

import asyncio
import itertools
import os
import time
import unicodedata
from urllib.parse import quote

import httpx

TOKEN_URL = "https://oauth.battle.net/token"
LOCALE = "es_ES"
INDEX_TTL_SECONDS = 24 * 3600
MAX_ATTEMPTS = 3
MAX_RETRY_AFTER_SECONDS = 5.0


class BlizzardError(Exception):
    """Fallo al hablar con Blizzard: red, credenciales o respuesta inesperada."""


_client: httpx.AsyncClient | None = None

_token: str | None = None
_token_expires_at = 0.0
_token_lock = asyncio.Lock()

_index_cache: list[dict] = []
_index_expires_at = 0.0
_index_lock = asyncio.Lock()


def _region() -> str:
    return os.getenv("BLIZZARD_REGION", "eu")


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=15.0)
    return _client


def normalize(text: str) -> str:
    """Minúsculas y sin tildes, para comparar nombres al buscar."""
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).casefold()


def realm_slug(realm: str) -> str:
    return normalize(realm).strip().replace("'", "").replace(" ", "-")


def slot_from_template(template: str) -> str:
    """
    Las plantillas de Blizzard marcan dónde va el nombre con {name}:
    "Llamaestrellas {name}" es un antetítulo; "{name} el Matarreyes" es un título.
    """
    if "{name}" not in template:
        return "title"
    before = template.split("{name}", 1)[0].strip()
    return "prefix" if before else "title"


async def _get_token(force: bool = False) -> str:
    global _token, _token_expires_at
    async with _token_lock:
        if not force and _token and time.time() < _token_expires_at - 60:
            return _token

        client_id = os.getenv("BLIZZARD_CLIENT_ID")
        client_secret = os.getenv("BLIZZARD_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise BlizzardError("Faltan BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET")

        try:
            res = await _http().post(
                TOKEN_URL,
                data={"grant_type": "client_credentials"},
                auth=(client_id, client_secret),
            )
        except httpx.HTTPError as exc:
            raise BlizzardError("No se pudo contactar con Battle.net") from exc
        if res.status_code != 200:
            raise BlizzardError(f"Battle.net rechazó las credenciales ({res.status_code})")

        data = res.json()
        _token = data["access_token"]
        _token_expires_at = time.time() + int(data.get("expires_in", 86400))
        return _token


async def _get_json(path: str, namespace: str, locale: str | None = None) -> dict | None:
    """GET autenticado. Devuelve None si Blizzard responde 404."""
    params = {"namespace": namespace}
    if locale:
        params["locale"] = locale
    url = f"https://{_region()}.api.blizzard.com{path}"

    force_token = False
    token_refreshed = False
    for _ in range(MAX_ATTEMPTS):
        token = await _get_token(force=force_token)
        force_token = False
        try:
            res = await _http().get(
                url, params=params, headers={"Authorization": f"Bearer {token}"}
            )
        except httpx.HTTPError as exc:
            raise BlizzardError(f"No se pudo contactar con Blizzard ({path})") from exc

        if res.status_code == 200:
            return res.json()
        if res.status_code == 404:
            return None
        if res.status_code == 401 and not token_refreshed:
            token_refreshed = True
            force_token = True
            continue
        if res.status_code == 429:
            try:
                wait = float(res.headers.get("Retry-After", 1))
            except ValueError:
                wait = 1.0
            await asyncio.sleep(min(wait, MAX_RETRY_AFTER_SECONDS))
            continue
        raise BlizzardError(f"Blizzard respondió {res.status_code} en {path}")

    raise BlizzardError(f"Blizzard no responde tras varios intentos ({path})")


async def _load_title_index() -> list[dict]:
    global _index_cache, _index_expires_at
    if _index_cache and time.time() < _index_expires_at:
        return _index_cache

    async with _index_lock:
        if _index_cache and time.time() < _index_expires_at:
            return _index_cache

        data = await _get_json(
            "/data/wow/title/index", f"static-{_region()}", locale=LOCALE
        )
        if data is None:
            raise BlizzardError("Blizzard no devolvió el índice de títulos")

        entries = [
            {"id": t["id"], "name": t["name"], "key": normalize(t["name"])}
            for t in data.get("titles", [])
            if t.get("id") is not None and t.get("name")
        ]
        entries.sort(key=lambda e: e["key"])
        _index_cache = entries
        _index_expires_at = time.time() + INDEX_TTL_SECONDS
        return _index_cache


async def search_titles(query: str, limit: int = 20) -> list[dict]:
    """Títulos del índice de Blizzard cuyo nombre contiene `query`, ordenados por nombre."""
    entries = await _load_title_index()
    needle = normalize(query).strip()
    matches = (e for e in entries if needle in e["key"])
    return [{"id": e["id"], "name": e["name"]} for e in itertools.islice(matches, limit)]


async def get_title(title_id: int) -> dict | None:
    data = await _get_json(
        f"/data/wow/title/{title_id}", f"static-{_region()}", locale=LOCALE
    )
    if data is None:
        return None

    gender_name = data.get("gender_name") or {}
    template = gender_name.get("male") or gender_name.get("female") or data.get("name") or ""
    source = data.get("source") or {}
    return {
        "id": data["id"],
        "name": data.get("name") or "",
        "template": template,
        "slot": slot_from_template(template),
        "source_type": (source.get("type") or {}).get("name"),
        "achievements": [a["name"] for a in source.get("achievements", []) if a.get("name")],
    }


async def get_character_title_ids(realm: str, name: str) -> set[int]:
    """IDs de los títulos que el personaje tiene desbloqueados en el juego."""
    path = (
        f"/profile/wow/character/{quote(realm_slug(realm))}"
        f"/{quote(name.strip().lower())}/titles"
    )
    data = await _get_json(path, f"profile-{_region()}")
    if data is None:
        return set()
    return {t["id"] for t in data.get("titles", []) if t.get("id") is not None}
