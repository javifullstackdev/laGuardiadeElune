"""
Ingesta de M+ desde Raider.io.

1. Roster de la hermandad (Blizzard): define quién es «de la hermandad».
2. Partidas recientes de los personajes Retail verificados de los usuarios de la web.
   Solo verificados: si no, cualquiera podría añadir el personaje de otro y llevarse sus puntos.
3. Cada partida nueva se guarda en processed_runs (puntúe o no) para no repetirla.
   Puntúa si al menos 3 de los 5 están en el roster; cada usuario de la web del grupo
   recibe un evento competitivo con tope (ver services/points.py).
"""

import asyncio
import logging
from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.character import Character
from app.models.enums import EventCategory
from app.models.processed_run import ProcessedRun
from app.models.user import User
from app.services import blizzard, raiderio
from app.services import points as points_service
from app.services import seasons as season_service

log = logging.getLogger(__name__)

SOURCE = "raiderio"
MIN_GUILD_MEMBERS = 3
CONCURRENCY = 3


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _web_characters(db: Session) -> dict[tuple[str, str], Character]:
    rows = (
        db.query(Character)
        .join(User, User.id == Character.user_id)
        .filter(
            Character.game == "retail",
            Character.is_verified.is_(True),
            Character.deleted_at.is_(None),
            User.deleted_at.is_(None),
        )
        .all()
    )
    return {blizzard.character_key(c.name, c.realm): c for c in rows}


async def sync_mythic_plus(db: Session) -> dict:
    report = {
        "season": None,
        "characters": 0,
        "runs_seen": 0,
        "runs_new": 0,
        "runs_scored": 0,
        "transactions": 0,
        "errors": [],
    }
    season = season_service.current_season(db)
    if season is None:
        report["errors"].append("No hay temporada en curso")
        return report
    report["season"] = season.name
    start = points_service.points_start(season)

    roster = await blizzard.get_guild_roster_keys()
    characters = _web_characters(db)
    report["characters"] = len(characters)

    sem = asyncio.Semaphore(CONCURRENCY)

    async def fetch(key: tuple[str, str], char: Character) -> list[dict]:
        async with sem:
            try:
                return await raiderio.recent_runs(char.name, key[1])
            except raiderio.RaiderIOError as exc:
                report["errors"].append(f"{char.name}-{char.realm}: {exc}")
                return []

    results = await asyncio.gather(*(fetch(k, c) for k, c in characters.items()))

    runs: dict[str, dict] = {}
    for run_list in results:
        for run in run_list:
            if _parse_time(run["completed_at"]) < start:
                continue
            runs.setdefault(f"{raiderio.run_season(run)}:{run['keystone_run_id']}", run)
    report["runs_seen"] = len(runs)

    known = {
        ext
        for (ext,) in db.query(ProcessedRun.external_id).filter(
            ProcessedRun.source == SOURCE, ProcessedRun.external_id.in_(list(runs))
        )
    }
    pending = sorted(
        ((ext, run) for ext, run in runs.items() if ext not in known),
        key=lambda item: item[1]["completed_at"],
    )

    for external_id, run in pending:
        try:
            details = await raiderio.run_details(raiderio.run_season(run), run["keystone_run_id"])
        except raiderio.RaiderIOError as exc:
            report["errors"].append(f"{external_id}: {exc}")
            continue
        if not details or details.get("deleted_at") or details.get("status") != "finished":
            continue

        members = [
            blizzard.character_key(m["character"]["name"], m["character"]["realm"]["slug"])
            for m in details.get("roster", [])
        ]
        guild_count = sum(1 for key in members if key in roster)
        timed = (details.get("num_chests") or 0) > 0
        level = details["mythic_level"]
        completed_at = _parse_time(details["completed_at"])
        dungeon = (details.get("dungeon") or {}).get("name") or run.get("dungeon") or "?"

        processed = ProcessedRun(
            source=SOURCE,
            external_id=external_id,
            dungeon=dungeon,
            mythic_level=level,
            timed=timed,
            completed_at=completed_at,
            guild_member_count=guild_count,
        )
        db.add(processed)
        try:
            db.flush()
            created = 0
            amount = points_service.mythic_plus_points(level, timed)
            if guild_count >= MIN_GUILD_MEMBERS and amount > 0:
                reason = (
                    f"M+ {dungeon} +{level} {'a tiempo' if timed else 'fuera de tiempo'}"
                    f" ({guild_count}/{len(members)} de la hermandad)"
                )
                awarded: set = set()
                for key in members:
                    char = characters.get(key)
                    if char is None or char.user_id in awarded:
                        continue
                    awarded.add(char.user_id)
                    tx = points_service.record_capped_event(
                        db,
                        user_id=char.user_id,
                        amount=amount,
                        reason=reason,
                        category=EventCategory.MYTHIC_PLUS,
                        occurred_at=completed_at,
                        character_id=char.id,
                        processed_run_id=processed.id,
                    )
                    created += tx is not None
            db.commit()
        except IntegrityError:
            # Otra sincronización la procesó a la vez
            db.rollback()
            continue
        report["runs_new"] += 1
        report["runs_scored"] += created > 0
        report["transactions"] += created

    return report


async def sync_in_background() -> None:
    db = SessionLocal()
    try:
        report = await sync_mythic_plus(db)
        log.info("Sincronización de M+: %s", report)
    except Exception:
        log.exception("Falló la sincronización de M+")
    finally:
        db.close()
