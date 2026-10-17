"""Catálogo de mazmorras de M+: nombre en español, slug y portada."""

from pathlib import Path

from app.services.blizzard import normalize
from app.urls import static_url

UPLOAD_DIR = Path("uploads/dungeons")
IMAGE_EXTS = ("jpg", "jpeg", "png", "webp")

CATALOG: list[dict] = [
    # Midnight temporada 2
    {
        "slug": "altar-of-fangs",
        "name_en": "Altar of Fangs",
        "name_es": "Altar de los Colmillos",
        "aliases": ["altar of the fang", "altar de los colmillos"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/altar-of-fangs.jpg",
    },
    {
        "slug": "voidscar-arena",
        "name_en": "Voidscar Arena",
        "name_es": "Arena Lacravacua",
        "aliases": ["arena lacravacua"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/voidscar-arena.jpg",
    },
    {
        "slug": "murder-row",
        "name_en": "Murder Row",
        "name_es": "Frontal de la Muerte",
        "aliases": ["frontal de la muerte"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/murder-row.jpg",
    },
    {
        "slug": "den-of-nalorakk",
        "name_en": "Den of Nalorakk",
        "name_es": "Guarida de Nalorakk",
        "aliases": ["nalorakk's lair", "guarida de nalorakk"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/den-of-nalorakk.jpg",
    },
    {
        "slug": "the-blinding-vale",
        "name_en": "The Blinding Vale",
        "name_es": "El Valle Cegador",
        "aliases": ["blinding vale", "el valle cegador", "valle cegador"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/the-blinding-vale.jpg",
    },
    {
        "slug": "kings-rest",
        "name_en": "Kings' Rest",
        "name_es": "Reposo de los Reyes",
        "aliases": ["king's rest", "kings rest", "reposo de los reyes"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion7/base/kings-rest.jpg",
    },
    {
        "slug": "ruby-life-pools",
        "name_en": "Ruby Life Pools",
        "name_es": "Estanques de Vida Rubí",
        "aliases": ["estanques de vida rubi", "estanques de vida rubí"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion9/base/ruby-life-pools.jpg",
    },
    {
        "slug": "temple-of-sethraliss",
        "name_en": "Temple of Sethraliss",
        "name_es": "Templo de Sethraliss",
        "aliases": ["templo de sethraliss"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion7/base/temple-of-sethraliss.jpg",
    },
    # Midnight temporada 1 (por si quedan partidas antiguas)
    {
        "slug": "windrunner-spire",
        "name_en": "Windrunner Spire",
        "name_es": "Aguja Brisaveloz",
        "aliases": ["agujas brisaveloz", "aguje brisaveloz"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/windrunner-spire.jpg",
    },
    {
        "slug": "magisters-terrace",
        "name_en": "Magisters' Terrace",
        "name_es": "Bancal del Magister",
        "aliases": ["magister's terrace", "bancal del magister"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/magisters-terrace.jpg",
    },
    {
        "slug": "nexuspoint-xenas",
        "name_en": "Nexus-Point Xenas",
        "name_es": "Punto de Nexo: Xenas",
        "aliases": ["nexus-point xenas", "punto de nexo: xenas", "punto de nexo xenas"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/nexuspoint-xenas.jpg",
    },
    {
        "slug": "maisara-caverns",
        "name_en": "Maisara Caverns",
        "name_es": "Cavernas de Maisara",
        "aliases": ["cavernas de maisara"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion11/base/maisara-caverns.jpg",
    },
    {
        "slug": "algethar-academy",
        "name_en": "Algeth'ar Academy",
        "name_es": "Academia Algeth'ar",
        "aliases": ["academia algeth'ar", "academia algethar"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion9/base/algethar-academy.jpg",
    },
    {
        "slug": "pit-of-saron",
        "name_en": "Pit of Saron",
        "name_es": "Foso de Saron",
        "aliases": ["foso de saron"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion2/base/pit-of-saron.jpg",
    },
    {
        "slug": "skyreach",
        "name_en": "Skyreach",
        "name_es": "Trecho Celestial",
        "aliases": ["trecho celestial"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion5/base/skyreach.jpg",
    },
    {
        "slug": "seat-of-the-triumvirate",
        "name_en": "Seat of the Triumvirate",
        "name_es": "Trono del Triunvirato",
        "aliases": ["trono del triunvirato"],
        "image_url": "https://cdn.raiderio.net/images/dungeons/expansion6/base/seat-of-the-triumvirate.jpg",
    },
]


def _index() -> tuple[dict[str, dict], dict[str, dict]]:
    by_slug: dict[str, dict] = {}
    by_alias: dict[str, dict] = {}
    for item in CATALOG:
        by_slug[item["slug"]] = item
        for key in (item["slug"], item["name_en"], item["name_es"], *item.get("aliases", [])):
            by_alias[normalize(key)] = item
    return by_slug, by_alias


BY_SLUG, BY_ALIAS = _index()


def custom_image_url(slug: str) -> str | None:
    for ext in IMAGE_EXTS:
        path = UPLOAD_DIR / f"{slug}.{ext}"
        if path.is_file():
            return static_url(f"dungeons/{slug}.{ext}")
    return None


def image_url(item: dict) -> str:
    return custom_image_url(item["slug"]) or item["image_url"]


def resolve(raw) -> dict | None:
    """Acepta el objeto dungeon de Raider.io, un slug o un nombre en cualquier idioma."""
    if raw is None:
        return None
    if isinstance(raw, dict):
        slug = (raw.get("slug") or "").strip()
        if slug and slug in BY_SLUG:
            return BY_SLUG[slug]
        name = raw.get("name") or raw.get("short_name") or ""
        return BY_ALIAS.get(normalize(name)) if name else None
    text = str(raw).strip()
    if not text:
        return None
    return BY_SLUG.get(text) or BY_ALIAS.get(normalize(text))


def present(name: str | None, slug: str | None = None) -> dict:
    item = (BY_SLUG.get(slug) if slug else None) or resolve(name)
    if item is None:
        return {
            "slug": slug,
            "name": name or "Mítica+",
            "image_url": None,
        }
    return {
        "slug": item["slug"],
        "name": item["name_es"],
        "image_url": image_url(item),
    }


def list_catalog() -> list[dict]:
    return [
        {
            "slug": item["slug"],
            "name": item["name_es"],
            "name_en": item["name_en"],
            "image_url": image_url(item),
            "custom": custom_image_url(item["slug"]) is not None,
        }
        for item in CATALOG
    ]
