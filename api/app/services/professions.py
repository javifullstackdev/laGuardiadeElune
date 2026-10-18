"""Profesiones de fabricación y la última lectura guardada de Blizzard."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.craft import CharacterProfessionSkill

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
