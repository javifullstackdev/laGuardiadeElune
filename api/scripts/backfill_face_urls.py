"""Rellena face_url de personajes Retail desde Character Media API."""
from __future__ import annotations

import asyncio
import os
import sys

import httpx
from sqlalchemy.orm import Session

# Permitir `python scripts/backfill_face_urls.py` desde /app o api/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal  # noqa: E402
import app.models.character_story  # noqa: E402,F401  # registra FK published_story_id
from app.models.character import Character  # noqa: E402
from app.routers.characters import (  # noqa: E402
    _blizzard_client_token,
    _fetch_character_media,
)

BLIZZARD_REGION = os.getenv("BLIZZARD_REGION", "eu")


async def run() -> int:
    db: Session = SessionLocal()
    updated = 0
    try:
        chars = (
            db.query(Character)
            .filter(
                Character.game == "retail",
                Character.deleted_at.is_(None),
                Character.face_url.is_(None),
            )
            .all()
        )
        if not chars:
            print("No characters need face_url")
            return 0

        async with httpx.AsyncClient() as client:
            token = await _blizzard_client_token(client)
            if not token:
                print("No Blizzard client token")
                return 1
            for char in chars:
                media = await _fetch_character_media(
                    client, char.name, char.realm, token
                )
                face = media.get("face_url")
                if face:
                    char.face_url = face
                    updated += 1
                    print(f"OK {char.name}-{char.realm}")
                else:
                    print(f"SKIP {char.name}-{char.realm}")
            if updated:
                db.commit()
        print(f"Updated {updated}/{len(chars)}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
