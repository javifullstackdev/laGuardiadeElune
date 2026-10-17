"""
Comprueba los personajes Retail verificados contra el roster de Battle.net de su dueño.

Antes de que POST /characters/add comprobara la pertenencia en el servidor, cualquier
nombre/reino quedaba marcado como verificado. Este script separa los personajes en:
  - confirmados: aparecen en el roster de su dueño
  - ajenos: el dueño tiene token válido y el personaje no está en su roster
  - sin comprobar: el dueño no tiene token válido, no hay forma de saberlo

Uso (dentro del contenedor de la API, o desde api/ con el .env cargado):
    python scripts/reverify_characters.py                                  # solo informa
    python scripts/reverify_characters.py --apply                          # desverifica los ajenos
    python scripts/reverify_characters.py --apply --unverify-unchecked     # y los sin comprobar
"""
from __future__ import annotations

import argparse
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal  # noqa: E402
# Los modelos se resuelven por nombre en relationship(); fuera de la app hay que registrarlos todos
# o configure_mappers() falla (p. ej. "expression 'Title' failed to locate a name").
import app.models.achievement  # noqa: E402,F401
import app.models.character_relation  # noqa: E402,F401
import app.models.character_story  # noqa: E402,F401
import app.models.character_title  # noqa: E402,F401
import app.models.hero_slide  # noqa: E402,F401
import app.models.image_request  # noqa: E402,F401
import app.models.point_transaction  # noqa: E402,F401
import app.models.post  # noqa: E402,F401
import app.models.relation_claim  # noqa: E402,F401
import app.models.season  # noqa: E402,F401
import app.models.title  # noqa: E402,F401
import app.models.user_achievement  # noqa: E402,F401
from app.models.character import Character  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.blizzard import realm_slug  # noqa: E402

BLIZZARD_REGION = os.getenv("BLIZZARD_REGION", "eu")


def fetch_roster(client: httpx.Client, access_token: str) -> set[tuple[str, str]] | None:
    """Claves (nombre, reino) del roster del usuario, o None si Blizzard no deja leerlo."""
    try:
        res = client.get(
            f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/user/wow",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"namespace": f"profile-{BLIZZARD_REGION}", "locale": "es_ES"},
        )
    except httpx.HTTPError:
        return None
    if res.status_code != 200:
        return None
    return {
        (c["name"].lower(), c["realm"]["slug"].lower())
        for account in res.json().get("wow_accounts", [])
        for c in account.get("characters", [])
    }


def split_by_roster(characters, roster: set[tuple[str, str]]):
    confirmed, foreign = [], []
    for char in characters:
        key = (char.name.lower(), realm_slug(char.realm))
        (confirmed if key in roster else foreign).append(char)
    return confirmed, foreign


def has_valid_token(user: User, now: datetime) -> bool:
    if not user.blizzard_access_token:
        return False
    return user.blizzard_token_expires_at is None or user.blizzard_token_expires_at > now


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="aplica los cambios (por defecto solo informa)")
    parser.add_argument("--unverify-unchecked", action="store_true",
                        help="con --apply, desverifica también los que no se pudieron comprobar")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        characters = (
            db.query(Character)
            .filter(
                Character.game == "retail",
                Character.is_verified == True,
                Character.deleted_at.is_(None),
            )
            .all()
        )
        by_user: dict = defaultdict(list)
        for char in characters:
            by_user[char.user_id].append(char)

        users = {u.id: u for u in db.query(User).filter(User.id.in_(by_user.keys())).all()} if by_user else {}
        now = datetime.now(timezone.utc)

        confirmed_total = 0
        foreign: list[tuple[str, Character]] = []
        unchecked: list[tuple[str, Character]] = []

        with httpx.Client(timeout=10.0) as client:
            for user_id, chars in by_user.items():
                user = users.get(user_id)
                label = user.username if user else str(user_id)
                roster = fetch_roster(client, user.blizzard_access_token) if user and has_valid_token(user, now) else None
                if roster is None:
                    unchecked.extend((label, c) for c in chars)
                    continue
                confirmed, not_in_roster = split_by_roster(chars, roster)
                confirmed_total += len(confirmed)
                foreign.extend((label, c) for c in not_in_roster)

        print(f"Confirmados: {confirmed_total}")
        print(f"Ajenos (no están en el roster de su dueño): {len(foreign)}")
        for label, c in foreign:
            print(f"  - {c.name}-{c.realm}  (dueño: {label})")
        print(f"Sin comprobar (dueño sin token válido): {len(unchecked)}")
        for label, c in unchecked:
            print(f"  - {c.name}-{c.realm}  (dueño: {label})")

        to_unverify = [c for _, c in foreign]
        if args.unverify_unchecked:
            to_unverify += [c for _, c in unchecked]

        if not args.apply:
            print(f"\nModo informe: no se ha cambiado nada. Con --apply se desverificarían {len(to_unverify)}.")
            return 0

        for char in to_unverify:
            char.is_verified = False
        db.commit()
        print(f"\nDesverificados: {len(to_unverify)}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
