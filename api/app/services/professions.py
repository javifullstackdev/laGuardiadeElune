"""Profesiones de fabricación y la última lectura guardada de Blizzard."""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.character import Character
from app.models.craft import CharacterProfessionSkill
from app.models.user import User
from app.services import blizzard

SNAPSHOT_TTL = timedelta(hours=12)
REFRESH_BUDGET_SECONDS = 12

# Ids estables de la API de Blizzard. Solo las que fabrican objetos.
CRAFTING_PROFESSIONS = (
    {"id": 164, "name": "Herrería"},
    {"id": 165, "name": "Peletería"},
    {"id": 197, "name": "Sastrería"},
    {"id": 202, "name": "Ingeniería"},
    {"id": 773, "name": "Inscripción"},
    {"id": 171, "name": "Alquimia"},
    {"id": 755, "name": "Joyería"},
    {"id": 333, "name": "Encantamiento"},
    {"id": 185, "name": "Cocina"},
)

CRAFTING_IDS = {row["id"] for row in CRAFTING_PROFESSIONS}
CRAFTING_NAMES = {row["id"]: row["name"] for row in CRAFTING_PROFESSIONS}


def summarize_profession(prof_data: dict) -> dict:
    """La ficha y el tablón de artesanos usan el tramo de la expansión más nueva."""
    tiers = prof_data.get("tiers") or []
    latest = tiers[-1] if tiers else None
    return {
        "name": (prof_data.get("profession") or {}).get("name", ""),
        "id": (prof_data.get("profession") or {}).get("id", 0),
        "tiers": [
            {
                "name": (tier.get("tier") or {}).get("name", ""),
                "skill_points": tier.get("skill_points", 0),
                "max_skill_points": tier.get("max_skill_points", 0),
                "recipe_count": len(tier.get("known_recipes") or []),
            }
            for tier in tiers
        ],
        "current_skill": latest.get("skill_points", 0) if latest else 0,
        "current_max": latest.get("max_skill_points", 0) if latest else 0,
        "current_tier_name": (latest.get("tier") or {}).get("name", "") if latest else "",
        "total_recipes": sum(len(tier.get("known_recipes") or []) for tier in tiers),
    }


def _token_is_fresh(user: User, now: datetime) -> bool:
    if not user.blizzard_access_token or not user.blizzard_token_expires_at:
        return False
    expires = user.blizzard_token_expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires > now


async def refresh_profession_snapshots(db: Session) -> None:
    """Lee Battle.net de quien tenga el enlace vigente y la foto tenga más de 12 h."""
    now = datetime.now(timezone.utc)
    users = (
        db.query(User)
        .filter(User.deleted_at.is_(None), User.blizzard_access_token.isnot(None))
        .all()
    )
    jobs: list[tuple[str, Character]] = []
    for user in users:
        if not _token_is_fresh(user, now):
            continue
        characters = (
            db.query(Character)
            .filter(
                Character.user_id == user.id,
                Character.deleted_at.is_(None),
                Character.game == "retail",
            )
            .all()
        )
        for char in characters:
            latest = (
                db.query(func.max(CharacterProfessionSkill.updated_at))
                .filter(CharacterProfessionSkill.character_id == char.id)
                .scalar()
            )
            if latest is not None:
                if latest.tzinfo is None:
                    latest = latest.replace(tzinfo=timezone.utc)
                if now - latest < SNAPSHOT_TTL:
                    continue
            jobs.append((user.blizzard_access_token, char))
    if not jobs:
        return

    sem = asyncio.Semaphore(4)

    async def _pull(token: str, char: Character):
        async with sem:
            try:
                raw = await asyncio.wait_for(
                    blizzard.get_profile_professions(token, char.realm, char.name),
                    timeout=8,
                )
            except Exception:
                return char.id, None
            if raw is None:
                return char.id, None
            parsed = [summarize_profession(row) for row in (raw.get("primaries") or [])]
            parsed += [summarize_profession(row) for row in (raw.get("secondaries") or [])]
            return char.id, parsed

    tasks = [asyncio.create_task(_pull(token, char)) for token, char in jobs]
    try:
        for finished in asyncio.as_completed(tasks, timeout=REFRESH_BUDGET_SECONDS):
            char_id, parsed = await finished
            if parsed is not None:
                store_profession_snapshot(db, char_id, parsed)
    except TimeoutError:
        pass
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
    db.expire_all()


def store_profession_snapshot(db: Session, character_id, parsed: list[dict]) -> None:
    """Sustituye la foto de profesiones de un personaje por la lectura recién hecha."""
    db.query(CharacterProfessionSkill).filter(
        CharacterProfessionSkill.character_id == character_id
    ).delete(synchronize_session=False)
    now = datetime.now(timezone.utc)
    seen: set[int] = set()
    for row in parsed:
        profession_id = int(row.get("id") or 0)
        if profession_id <= 0 or profession_id in seen:
            continue
        seen.add(profession_id)
        db.add(CharacterProfessionSkill(
            character_id=character_id,
            blizzard_profession_id=profession_id,
            name=(row.get("name") or CRAFTING_NAMES.get(profession_id) or "Profesión")[:120],
            skill_points=int(row.get("current_skill") or 0),
            max_skill_points=int(row.get("current_max") or 0),
            tier_name=((row.get("current_tier_name") or "")[:120] or None),
            updated_at=now,
        ))
    db.commit()
