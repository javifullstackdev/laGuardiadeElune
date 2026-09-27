"""Lookup de personajes en la armería de Blizzard (EU)."""

import os
import time
from pathlib import Path

import aiohttp
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / ".env")

BLIZZARD_REGION = os.getenv("BLIZZARD_REGION", "eu")
BLIZZARD_CLIENT_ID = os.getenv("BLIZZARD_CLIENT_ID")
BLIZZARD_CLIENT_SECRET = os.getenv("BLIZZARD_CLIENT_SECRET")

CLASS_BY_ID = {
    1: "WARRIOR", 2: "PALADIN", 3: "HUNTER", 4: "ROGUE", 5: "PRIEST",
    6: "DEATH_KNIGHT", 7: "SHAMAN", 8: "MAGE", 9: "WARLOCK", 10: "MONK",
    11: "DRUID", 12: "DEMONHUNTER", 13: "EVOKER",
}

_token: str | None = None
_token_expires_at = 0.0


def realm_slug(realm: str) -> str:
    return realm.strip().lower().replace(" ", "-")


async def _client_token() -> str:
    global _token, _token_expires_at
    if _token and time.time() < _token_expires_at - 60:
        return _token
    if not BLIZZARD_CLIENT_ID or not BLIZZARD_CLIENT_SECRET:
        raise ValueError("Faltan BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET en el .env")

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://oauth.battle.net/token",
            data={"grant_type": "client_credentials"},
            auth=aiohttp.BasicAuth(BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET),
        ) as res:
            if res.status != 200:
                raise ValueError("No se pudo autenticar con Battle.net")
            data = await res.json()

    _token = data["access_token"]
    _token_expires_at = time.time() + int(data.get("expires_in", 86400))
    return _token


async def lookup_wow_character(name: str, realm: str) -> dict:
    """
    Devuelve datos públicos de la armería o lanza ValueError si no existe.
    """
    token = await _client_token()
    slug = realm_slug(realm)
    url = (
        f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/wow/character"
        f"/{slug}/{name.strip().lower()}"
    )
    async with aiohttp.ClientSession() as session:
        async with session.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            params={"namespace": f"profile-{BLIZZARD_REGION}", "locale": "es_ES"},
        ) as res:
            if res.status == 404:
                raise ValueError(
                    f"No existe {name}-{slug} en la armería de WoW ({BLIZZARD_REGION.upper()})."
                )
            if res.status != 200:
                raise ValueError("La armería de Blizzard no respondió. Inténtalo de nuevo.")
            data = await res.json()

    playable = data.get("character_class") or {}
    return {
        "name": data.get("name") or name,
        "realm": slug,
        "blizzard_character_id": data.get("id"),
        "wow_class": CLASS_BY_ID.get(playable.get("id")),
        "level": data.get("level"),
        "faction": (data.get("faction") or {}).get("type"),
    }
