"""
Tareas periódicas de la API. Corren en el mismo proceso que uvicorn (en producción hay uno solo).

Orden: temporadas primero (una temporada nueva fija su points_start_at), luego M+ y títulos.
"""

import asyncio
import logging
import os

from app.services import mplus_sync, seasons, title_sync

log = logging.getLogger(__name__)


def enabled() -> bool:
    """Por defecto solo en producción: en local `--reload` lo relanzaría con cada cambio."""
    default = "1" if os.getenv("ENV", "development").lower() == "production" else "0"
    return os.getenv("SCHEDULER_ENABLED", default) == "1"


def interval_seconds() -> float:
    return float(os.getenv("SYNC_INTERVAL_HOURS", "6")) * 3600


async def run_once() -> None:
    await seasons.sync_in_background()
    await mplus_sync.sync_in_background()
    try:
        await title_sync.sync_all_characters()
    except Exception:
        log.exception("Falló la sincronización periódica de títulos")


async def run_forever() -> None:
    hours = interval_seconds() / 3600
    log.info("Revisión periódica cada %.1f h (M+, temporadas y títulos)", hours)
    while True:
        await run_once()
        await asyncio.sleep(interval_seconds())
