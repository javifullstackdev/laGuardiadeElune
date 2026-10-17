"""Cliente de la API pública de Raider.io (sin clave)."""

import asyncio

import httpx

BASE = "https://raider.io/api/v1"
MAX_ATTEMPTS = 3


class RaiderIOError(Exception):
    """Raider.io no respondió o devolvió algo inesperado."""


_client: httpx.AsyncClient | None = None


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=20.0)
    return _client


async def _get(path: str, **params) -> dict | None:
    """GET con reintentos. None si Raider.io responde 400/404 (personaje o partida inexistente)."""
    for attempt in range(MAX_ATTEMPTS):
        try:
            res = await _http().get(f"{BASE}{path}", params=params)
        except httpx.HTTPError as exc:
            if attempt == MAX_ATTEMPTS - 1:
                raise RaiderIOError(f"Raider.io no responde ({path})") from exc
            await asyncio.sleep(1 + attempt)
            continue
        if res.status_code == 200:
            return res.json()
        if res.status_code in (400, 404):
            return None
        if res.status_code == 429 or res.status_code >= 500:
            await asyncio.sleep(2 * (attempt + 1))
            continue
        raise RaiderIOError(f"Raider.io respondió {res.status_code} en {path}")
    raise RaiderIOError(f"Raider.io no responde tras varios intentos ({path})")


async def recent_runs(name: str, realm_slug: str, region: str = "eu") -> list[dict]:
    """Últimas partidas de M+ del personaje (Raider.io guarda las 10 más recientes)."""
    data = await _get(
        "/characters/profile",
        region=region,
        realm=realm_slug,
        name=name,
        fields="mythic_plus_recent_runs",
    )
    return (data or {}).get("mythic_plus_recent_runs", [])


def run_season(run: dict) -> str:
    """La temporada va en la URL: https://raider.io/mythic-plus-runs/<season>/<id>-..."""
    return run["url"].split("/mythic-plus-runs/", 1)[1].split("/", 1)[0]


async def run_details(season: str, run_id: int) -> dict | None:
    """Detalle de la partida con los 5 integrantes. El id solo es único dentro de su temporada."""
    return await _get("/mythic-plus/run-details", season=season, id=run_id)
