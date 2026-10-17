import logging
import re
from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.season import Season
from app.models.user_season_path import UserSeasonPath
from app.services import blizzard

log = logging.getLogger(__name__)


def current_season(db: Session, at: datetime | None = None) -> Season | None:
    """Temporada en curso: empezó y no ha terminado. Las fechas vienen de Blizzard y no se solapan."""
    at = at or datetime.now(timezone.utc)
    return (
        db.query(Season)
        .filter(
            Season.deleted_at.is_(None),
            Season.start_date <= at,
            or_(Season.end_date.is_(None), Season.end_date > at),
        )
        .order_by(Season.start_date.desc())
        .first()
    )


def season_path(db: Session, user_id, season_id) -> UserSeasonPath | None:
    return (
        db.query(UserSeasonPath)
        .filter(UserSeasonPath.user_id == user_id, UserSeasonPath.season_id == season_id)
        .first()
    )


def serialize(season: Season) -> dict:
    return {
        "id": str(season.id),
        "name": season.name,
        "description": season.description,
        "start_date": season.start_date.isoformat(),
        "end_date": season.end_date.isoformat() if season.end_date else None,
        "points_start_at": season.points_start_at.isoformat() if season.points_start_at else None,
        "blizzard_season_id": season.blizzard_season_id,
    }


def _from_ms(value: int | None) -> datetime | None:
    return datetime.fromtimestamp(value / 1000, timezone.utc) if value else None


def _season_name(data: dict) -> str:
    # "Mazmorras míticas+ (Midnight temporada 2)" → "Midnight temporada 2"
    raw = data.get("season_name") or f"Temporada {data['id']}"
    match = re.search(r"\(([^)]+)\)", raw)
    name = match.group(1) if match else raw
    return name[:1].upper() + name[1:]


async def sync_from_blizzard(db: Session) -> list[Season]:
    """
    Importa la temporada de míticas+ actual de Blizzard y actualiza las que siguen
    abiertas en BD (para recoger su fecha de fin cuando Blizzard la publique).
    """
    open_ids = {
        s.blizzard_season_id
        for s in db.query(Season).filter(
            Season.blizzard_season_id.isnot(None), Season.end_date.is_(None)
        )
    }
    ids = sorted(open_ids | {await blizzard.get_current_mythic_season_id()})

    synced = []
    for season_id in ids:
        data = await blizzard.get_mythic_season(season_id)
        if data is None or not data.get("start_timestamp"):
            continue
        season = db.query(Season).filter(Season.blizzard_season_id == season_id).first()
        if season is None:
            season = Season(blizzard_season_id=season_id, description="")
            db.add(season)
        season.name = _season_name(data)
        season.start_date = _from_ms(data["start_timestamp"])
        season.end_date = _from_ms(data.get("end_timestamp"))
        if season.points_start_at is None:
            season.points_start_at = max(season.start_date, datetime.now(timezone.utc))
        synced.append(season)
    db.commit()
    return synced


async def sync_in_background() -> None:
    db = SessionLocal()
    try:
        synced = await sync_from_blizzard(db)
        log.info("Temporadas sincronizadas con Blizzard: %s", [s.name for s in synced])
    except Exception:
        log.exception("No se pudieron sincronizar las temporadas con Blizzard")
    finally:
        db.close()
