"""Sincroniza los títulos del catálogo con los que cada personaje tiene en el juego."""

import asyncio
import logging
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.character import Character
from app.models.character_title import CharacterTitle
from app.models.title import Title
from app.services import blizzard

logger = logging.getLogger(__name__)

MAX_CONCURRENT_REQUESTS = 5


def _catalog(db: Session) -> dict[int, UUID]:
    """Títulos del catálogo respaldados por Blizzard: {blizzard_title_id: title_id}."""
    rows = (
        db.query(Title.blizzard_title_id, Title.id)
        .filter(Title.blizzard_title_id.isnot(None), Title.is_active == True)
        .all()
    )
    return {blizzard_id: title_id for blizzard_id, title_id in rows}


def _grant_missing(
    db: Session, character_id: UUID, in_game_ids: set[int], catalog: dict[int, UUID]
) -> int:
    wanted = {catalog[i] for i in in_game_ids & catalog.keys()}
    if not wanted:
        return 0

    owned = {
        row[0]
        for row in db.query(CharacterTitle.title_id).filter(
            CharacterTitle.character_id == character_id,
            CharacterTitle.title_id.in_(wanted),
        )
    }
    missing = wanted - owned
    if not missing:
        return 0

    db.add_all(CharacterTitle(character_id=character_id, title_id=t) for t in missing)
    try:
        db.commit()
    except IntegrityError:
        # Otra sincronización insertó la misma fila entre la lectura y el commit.
        db.rollback()
        return 0
    return len(missing)


async def sync_character(db: Session, character: Character) -> int:
    """Sincroniza un personaje con la sesión del llamador. Devuelve cuántos títulos nuevos recibe."""
    catalog = _catalog(db)
    if not catalog:
        return 0
    in_game_ids = await blizzard.get_character_title_ids(character.realm, character.name)
    return _grant_missing(db, character.id, in_game_ids, catalog)


async def sync_character_in_background(character_id: UUID) -> None:
    db = SessionLocal()
    try:
        character = (
            db.query(Character)
            .filter(Character.id == character_id, Character.deleted_at.is_(None))
            .first()
        )
        if character is None or character.game != "retail":
            return
        await sync_character(db, character)
    except blizzard.BlizzardError:
        logger.warning("No se pudieron sincronizar los títulos del personaje %s", character_id, exc_info=True)
    finally:
        db.close()


async def sync_all_characters() -> int:
    """
    Sincroniza todos los personajes retail verificados. Pensada para BackgroundTasks:
    abre su propia sesión porque la de la petición ya estará cerrada.
    """
    db = SessionLocal()
    try:
        catalog = _catalog(db)
        if not catalog:
            return 0

        targets = (
            db.query(Character.id, Character.realm, Character.name)
            .filter(
                Character.game == "retail",
                Character.is_verified == True,
                Character.deleted_at.is_(None),
            )
            .all()
        )

        semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

        async def fetch(character_id: UUID, realm: str, name: str):
            async with semaphore:
                try:
                    return character_id, await blizzard.get_character_title_ids(realm, name)
                except blizzard.BlizzardError:
                    logger.warning("No se pudieron leer los títulos de %s-%s", name, realm, exc_info=True)
                    return character_id, None

        results = await asyncio.gather(*(fetch(*t) for t in targets))

        granted = 0
        for character_id, in_game_ids in results:
            if in_game_ids:
                granted += _grant_missing(db, character_id, in_game_ids, catalog)
        logger.info("Sincronización de títulos: %d nuevos en %d personajes", granted, len(targets))
        return granted
    finally:
        db.close()
