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


async def _get_json(
    path: str,
    namespace: str,
    locale: str | None = None,
    extra: dict | None = None,
) -> dict | None:
    """GET autenticado. Devuelve None si Blizzard responde 404."""
    params = {"namespace": namespace}
    if locale:
        params["locale"] = locale
    if extra:
        params.update(extra)
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


def guild_realm() -> str:
    return os.getenv("GUILD_REALM", "dun-modr")


def guild_slug() -> str:
    return os.getenv("GUILD_SLUG", "la-guardia-de-elune")


def character_key(name: str, realm: str) -> tuple[str, str]:
    """Clave para comparar personajes entre Blizzard, Raider.io y la BD."""
    return name.strip().casefold(), realm_slug(realm)


async def get_guild_roster_keys() -> set[tuple[str, str]]:
    """Personajes de la hermandad según Blizzard, como claves de character_key."""
    data = await _get_json(
        f"/data/wow/guild/{quote(guild_realm())}/{quote(guild_slug())}/roster",
        f"profile-{_region()}",
    )
    if not data or not data.get("members"):
        raise BlizzardError("Blizzard no devolvió el roster de la hermandad")
    return {
        character_key(m["character"]["name"], m["character"]["realm"]["slug"])
        for m in data["members"]
    }


async def get_current_mythic_season_id() -> int:
    data = await _get_json("/data/wow/mythic-keystone/season/index", f"dynamic-{_region()}")
    current = (data or {}).get("current_season") or {}
    if current.get("id") is None:
        raise BlizzardError("Blizzard no devolvió la temporada de míticas+ actual")
    return current["id"]


def _localized_name(raw) -> str:
    if isinstance(raw, dict):
        return (
            raw.get("es_ES")
            or raw.get("en_US")
            or next((v for v in raw.values() if isinstance(v, str) and v.strip()), "")
        )
    return str(raw or "").strip()


async def get_item_icon(item_id: int) -> str | None:
    data = await _get_json(f"/data/wow/media/item/{item_id}", f"static-{_region()}")
    for asset in (data or {}).get("assets") or []:
        if asset.get("key") == "icon" and asset.get("value"):
            return asset["value"]
    return None


def _crafting_label(preview: dict) -> str | None:
    raw = preview.get("crafting_reagent")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    if isinstance(raw, dict):
        label = raw.get("header") or raw.get("name") or raw.get("description")
        if isinstance(label, str) and label.strip():
            return label.strip()
    return None


async def get_craft_tooltip(item_id: int) -> dict:
    """Texto de tooltip: sabor, o el efecto de equipar si el objeto no tiene descripción."""
    data = await _get_json(f"/data/wow/item/{item_id}", f"static-{_region()}", locale=LOCALE)
    if not data:
        return {"description": None, "detail": None}
    preview = data.get("preview_item") or {}
    description = (data.get("description") or preview.get("description") or "").strip() or None
    if not description:
        for spell in preview.get("spells") or []:
            text = (spell.get("description") or "").strip()
            if text:
                description = text
                break
    if description and len(description) > 600:
        description = description[:597] + "…"
    slot = (preview.get("inventory_type") or data.get("inventory_type") or {}).get("name")
    detail = slot.strip() if isinstance(slot, str) and slot.strip() else None
    return {"description": description, "detail": detail}


async def get_item_details(item_id: int) -> dict:
    """Tooltip público: descripción y etiqueta de componente de profesión."""
    data = await _get_json(f"/data/wow/item/{item_id}", f"static-{_region()}", locale=LOCALE)
    if not data:
        return {"description": None, "crafting_label": None}
    preview = data.get("preview_item") or {}
    description = (data.get("description") or preview.get("description") or "").strip() or None
    if description and len(description) > 600:
        description = description[:597] + "…"
    return {
        "description": description,
        "crafting_label": _crafting_label(preview),
    }


async def search_items(query: str, limit: int = 12) -> list[dict]:
    """Busca objetos en el Game Data Search API (nombre en español, o inglés si no hay)."""
    needle = query.strip()
    if len(needle) < 2:
        return []
    page_size = max(1, min(limit, 20))
    data = await _get_json(
        "/data/wow/search/item",
        f"static-{_region()}",
        locale=LOCALE,
        extra={"name.es_ES": needle, "_page": 1, "_pageSize": page_size},
    )
    if not (data or {}).get("results"):
        data = await _get_json(
            "/data/wow/search/item",
            f"static-{_region()}",
            locale=LOCALE,
            extra={"name.en_US": needle, "_page": 1, "_pageSize": page_size},
        )
    rows = []
    seen: set[int] = set()
    for row in (data or {}).get("results") or []:
        payload = row.get("data") or {}
        item_id = payload.get("id")
        name = _localized_name(payload.get("name"))
        if not item_id or not name or item_id in seen:
            continue
        seen.add(item_id)
        quality = payload.get("quality") or {}
        rows.append(
            {
                "id": item_id,
                "name": name,
                "quality": (quality.get("type") or "").lower() or None,
                "icon_url": None,
                "description": None,
                "crafting_label": None,
            }
        )
        if len(rows) >= page_size:
            break

    async def _enrich(item: dict) -> None:
        icon, details = await asyncio.gather(
            get_item_icon(item["id"]),
            get_item_details(item["id"]),
            return_exceptions=True,
        )
        if isinstance(icon, str):
            item["icon_url"] = icon
        if isinstance(details, dict):
            item["description"] = details.get("description")
            item["crafting_label"] = details.get("crafting_label")

    await asyncio.gather(*(_enrich(item) for item in rows))
    return rows


async def get_mythic_season(season_id: int) -> dict | None:
    """Fechas en milisegundos UTC; end_timestamp falta mientras la temporada sigue abierta."""
    return await _get_json(
        f"/data/wow/mythic-keystone/season/{season_id}", f"dynamic-{_region()}", locale=LOCALE
    )


_recipe_cache: dict[int, tuple[float, list[dict]]] = {}
_recipe_lock = asyncio.Lock()


def _recipe_icon(media: dict | None) -> str | None:
    for asset in (media or {}).get("assets") or []:
        if asset.get("key") == "icon" and asset.get("value"):
            return asset["value"]
    return None


async def _profession_recipe_index(profession_id: int) -> list[dict]:
    """Recetas de una profesión, de la expansión más nueva a la más antigua."""
    cached = _recipe_cache.get(profession_id)
    if cached and time.time() < cached[0]:
        return cached[1]

    async with _recipe_lock:
        cached = _recipe_cache.get(profession_id)
        if cached and time.time() < cached[0]:
            return cached[1]

        prof = await _get_json(
            f"/data/wow/profession/{profession_id}", f"static-{_region()}", locale=LOCALE
        )
        tiers = list((prof or {}).get("skill_tiers") or [])
        if not tiers:
            raise BlizzardError("Blizzard no devolvió las recetas de esa profesión")

        async def _tier(tier: dict) -> list[dict]:
            data = await _get_json(
                f"/data/wow/profession/{profession_id}/skill-tier/{tier['id']}",
                f"static-{_region()}",
                locale=LOCALE,
            )
            rows = []
            for category in (data or {}).get("categories") or []:
                if normalize(category.get("name") or "") == "refabricacion":
                    continue
                for recipe in category.get("recipes") or []:
                    name = (recipe.get("name") or "").strip()
                    if recipe.get("id") and name:
                        rows.append({"id": recipe["id"], "name": name})
            return rows

        # El índice viene de más antiguo a más nuevo: invertimos para priorizar Midnight.
        grouped = await asyncio.gather(*(_tier(tier) for tier in reversed(tiers)))
        seen: set[str] = set()
        index: list[dict] = []
        for rows in grouped:
            for row in rows:
                key = normalize(row["name"])
                if key in seen:
                    continue
                seen.add(key)
                index.append(row)
        _recipe_cache[profession_id] = (time.time() + INDEX_TTL_SECONDS, index)
        return index


async def _item_by_exact_name(name: str) -> dict | None:
    needle = normalize(name)
    for field in ("name.es_ES", "name.en_US"):
        data = await _get_json(
            "/data/wow/search/item",
            f"static-{_region()}",
            locale=LOCALE,
            extra={field: name, "_page": 1, "_pageSize": 8},
        )
        for row in (data or {}).get("results") or []:
            payload = row.get("data") or {}
            item_name = _localized_name(payload.get("name"))
            if payload.get("id") and normalize(item_name) == needle:
                return payload
    return None


async def search_profession_crafts(profession_id: int, query: str, limit: int = 10) -> list[dict]:
    """Recetas de esa profesión cuyo nombre contiene la búsqueda, con icono y descripción."""
    needle = normalize(query).strip()
    if len(needle) < 2:
        return []
    index = await _profession_recipe_index(profession_id)
    matches = [row for row in index if needle in normalize(row["name"])][: max(1, min(limit, 12))]

    async def _enrich(recipe: dict) -> dict:
        media, item = await asyncio.gather(
            _get_json(f"/data/wow/media/recipe/{recipe['id']}", f"static-{_region()}"),
            _item_by_exact_name(recipe["name"]),
            return_exceptions=True,
        )
        icon = _recipe_icon(media) if isinstance(media, dict) else None
        description = None
        quality = None
        item_id = None
        detail_label = None
        if isinstance(item, dict):
            item_id = item.get("id")
            quality = ((item.get("quality") or {}).get("type") or "").lower() or None
            item_icon, details = await asyncio.gather(
                get_item_icon(item_id),
                get_craft_tooltip(item_id),
                return_exceptions=True,
            )
            if isinstance(item_icon, str):
                icon = item_icon
            if isinstance(details, dict):
                description = details.get("description")
                detail_label = details.get("detail")
        return {
            "recipe_id": recipe["id"],
            "id": item_id,
            "name": recipe["name"],
            "quality": quality,
            "icon_url": icon,
            "description": description,
            "detail": detail_label,
        }

    return list(await asyncio.gather(*(_enrich(row) for row in matches)))


async def get_profile_professions(token: str, realm: str, name: str) -> dict | None:
    """Profesiones de un personaje con el token de su dueño. None si Blizzard no autoriza la lectura."""
    slug = realm.strip().lower().replace(" ", "-")
    url = (
        f"https://{_region()}.api.blizzard.com/profile/wow/character/"
        f"{quote(slug)}/{quote(name.strip().lower())}/professions"
    )
    try:
        res = await _http().get(
            url,
            params={"namespace": f"profile-{_region()}", "locale": LOCALE},
            headers={"Authorization": f"Bearer {token}"},
        )
    except httpx.HTTPError as exc:
        raise BlizzardError("No se pudo leer las profesiones del personaje") from exc
    if res.status_code in (401, 403, 404):
        return None
    if res.status_code != 200:
        return None
    return res.json()


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
