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
from app.models.point_transaction import PointTransaction
from app.models.processed_run import ProcessedRun
from app.models.user import User
from app.services import blizzard, dungeons, raiderio
from app.services import points as points_service
from app.services import seasons as season_service

log = logging.getLogger(__name__)

SOURCE = "raiderio"
MIN_GUILD_MEMBERS = 3
CONCURRENCY = 3


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _party_keys_and_guild_names(
    details: dict, roster: set[tuple[str, str]]
) -> tuple[list[tuple[str, str]], list[str]]:
    keys: list[tuple[str, str]] = []
    names: list[str] = []
    for member in details.get("roster") or []:
        character = member.get("character") or {}
        name = (character.get("name") or "").strip()
        realm = (character.get("realm") or {}).get("slug") or ""
        if not name:
            continue
        key = blizzard.character_key(name, realm)
        keys.append(key)
        if key in roster:
            names.append(name)
    return keys, names


def _run_reason(dungeon: str, level: int, timed: bool, guild_names: list[str], party_size: int) -> str:
    clock = "a tiempo" if timed else "fuera de tiempo"
    count = f"{len(guild_names)}/{party_size} de la hermandad"
    if guild_names:
        return f"M+ {dungeon} +{level} {clock} — {', '.join(guild_names)} ({count})"
    return f"M+ {dungeon} +{level} {clock} ({count})"


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
        "runs": [],
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

        members, guild_names = _party_keys_and_guild_names(details, roster)
        guild_count = len(guild_names)
        timed = (details.get("num_chests") or 0) > 0
        level = details["mythic_level"]
        completed_at = _parse_time(details["completed_at"])
        info = dungeons.resolve(details.get("dungeon") or run.get("dungeon"))
        dungeon = (info["name_es"] if info else None) or (
            (details.get("dungeon") or {}).get("name") if isinstance(details.get("dungeon"), dict) else None
        ) or run.get("dungeon") or "?"
        dungeon_slug = info["slug"] if info else None
        reason = _run_reason(dungeon, level, timed, guild_names, len(members))

        processed = ProcessedRun(
            source=SOURCE,
            external_id=external_id,
            dungeon=dungeon,
            dungeon_slug=dungeon_slug,
            mythic_level=level,
            timed=timed,
            completed_at=completed_at,
            guild_member_count=guild_count,
            guild_character_names=", ".join(guild_names),
        )
        db.add(processed)
        try:
            db.flush()
            created = 0
            amount = points_service.mythic_plus_points(level, timed)
            if guild_count >= MIN_GUILD_MEMBERS and amount > 0:
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
        report["runs"].append(
            {
                "dungeon": dungeon,
                "dungeon_slug": dungeon_slug,
                "level": level,
                "timed": timed,
                "guild_characters": guild_names,
                "guild_count": guild_count,
                "party_size": len(members),
                "scored": created > 0,
                "reason": reason,
            }
        )

    await _fill_missing_guild_names(db, roster, report)
    return report


async def _fill_missing_guild_names(
    db: Session, roster: set[tuple[str, str]], report: dict
) -> None:
    """Completa nombres de hermandad en partidas ya guardadas (p. ej. la primera que ya puntuó)."""
    missing = (
        db.query(ProcessedRun)
        .filter(ProcessedRun.source == SOURCE, ProcessedRun.guild_character_names.is_(None))
        .all()
    )
    if not missing:
        return
    changed = False
    for processed in missing:
        try:
            season_slug, run_id = processed.external_id.split(":", 1)
            details = await raiderio.run_details(season_slug, int(run_id))
        except (ValueError, raiderio.RaiderIOError) as exc:
            report["errors"].append(f"{processed.external_id}: {exc}")
            continue
        if not details:
            processed.guild_character_names = ""
            changed = True
            continue
        _, guild_names = _party_keys_and_guild_names(details, roster)
        processed.guild_character_names = ", ".join(guild_names)
        party_size = len(details.get("roster") or []) or processed.guild_member_count
        reason = _run_reason(
            processed.dungeon, processed.mythic_level, processed.timed, guild_names, party_size
        )
        db.query(PointTransaction).filter(PointTransaction.processed_run_id == processed.id).update(
            {PointTransaction.reason: reason},
            synchronize_session=False,
        )
        changed = True
        if not any(item.get("reason") == reason for item in report["runs"]):
            report["runs"].append(
                {
                    "dungeon": processed.dungeon,
                    "level": processed.mythic_level,
                    "timed": processed.timed,
                    "guild_characters": guild_names,
                    "guild_count": len(guild_names),
                    "party_size": party_size,
                    "scored": True,
                    "reason": reason,
                }
            )
    if changed:
        db.commit()


async def sync_in_background() -> None:
    db = SessionLocal()
    try:
        report = await sync_mythic_plus(db)
        log.info("Sincronización de M+: %s", report)
    except Exception:
        log.exception("Falló la sincronización de M+")
    finally:
        db.close()
