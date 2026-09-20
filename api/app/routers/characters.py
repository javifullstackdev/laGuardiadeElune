"""
Router: /characters
Gestión de personajes WoW del usuario autenticado.
"""

import httpx
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.character import Character
from app.models.enums import CharacterClass
from app.schemas.character import CharacterAddInput, CharacterResponse, BlizzardCharacterOut, SetMainInput

BLIZZARD_REGION = os.getenv("BLIZZARD_REGION", "eu")

# Mapeo ID de clase de Blizzard → valor de nuestro enum CharacterClass
# https://develop.battle.net/documentation/world-of-warcraft/guides/playable-classes
BLIZZARD_CLASS_MAP: dict[int, str] = {
    1:  "WARRIOR",
    2:  "PALADIN",
    3:  "HUNTER",
    4:  "ROGUE",
    5:  "PRIEST",
    6:  "DEATH_KNIGHT",
    7:  "SHAMAN",
    8:  "MAGE",
    9:  "WARLOCK",
    10: "MONK",
    11: "DRUID",
    12: "DEMONHUNTER",
    13: "EVOKER",
}

router = APIRouter(prefix="/characters", tags=["characters"])


@router.get("/my", response_model=list[CharacterResponse])
def get_my_characters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Devuelve los personajes del usuario registrados en nuestra BD.
    El frontend los usa para saber cuáles ya tiene añadidos.
    """
    return (
        db.query(Character)
        .filter(
            Character.user_id == current_user.id,
            Character.deleted_at.is_(None),
        )
        .order_by(Character.is_main.desc(), Character.name)
        .all()
    )


@router.get("/blizzard", response_model=list[BlizzardCharacterOut])
async def get_blizzard_characters(
    current_user: User = Depends(get_current_user),
):
    """
    Llama a la API de Blizzard en tiempo real usando el token guardado
    y devuelve todos los personajes de la cuenta del usuario.

    El frontend los muestra para que el usuario elija cuáles añadir.
    """
    if not current_user.blizzard_access_token:
        raise HTTPException(
            status_code=400,
            detail="No tienes Battle.net vinculado. Ve a tu perfil para conectarlo."
        )

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://{BLIZZARD_REGION}.api.blizzard.com/profile/user/wow",
            headers={"Authorization": f"Bearer {current_user.blizzard_access_token}"},
            params={
                "namespace": f"profile-{BLIZZARD_REGION}",
                "locale": "es_ES",
            },
        )

    if res.status_code == 401:
        raise HTTPException(
            status_code=401,
            detail="Tu token de Battle.net ha caducado. Reconecta tu cuenta en el perfil."
        )

    if res.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Error al obtener personajes de Battle.net ({res.status_code})"
        )

    data = res.json()
    characters: list[BlizzardCharacterOut] = []

    # La API devuelve una lista de "wow_accounts" (una cuenta puede tener varias)
    for account in data.get("wow_accounts", []):
        for char in account.get("characters", []):
            characters.append(BlizzardCharacterOut(
                name=char["name"],
                realm=char["realm"]["slug"],
                realm_name=char["realm"]["name"],
                class_id=char["playable_class"]["id"],
                class_name=char["playable_class"]["name"],
                race_name=char["playable_race"]["name"],
                level=char["level"],
                faction=char["faction"]["type"],
                blizzard_character_id=char["id"],
            ))

    # Ordenar: primero el realm de la hermandad, luego por nivel
    characters.sort(key=lambda c: (c.realm != "dun-modr", -c.level))
    return characters


@router.patch("/set-main", response_model=CharacterResponse)
def set_main_character(
    data: SetMainInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Marca un personaje como main y el resto como alts.
    Llamado desde el perfil web con un solo click.
    """
    # Todos los personajes del usuario pasan a ser alts
    db.query(Character).filter(
        Character.user_id == current_user.id
    ).update({"is_main": False, "is_alt": True})

    # El seleccionado pasa a ser main
    char = (
        db.query(Character)
        .filter(
            Character.user_id == current_user.id,
            Character.name == data.name,
            Character.realm == data.realm,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not char:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    char.is_main = True
    char.is_alt = False
    db.commit()
    db.refresh(char)
    return char


@router.delete("/{name}/{realm}", status_code=204)
def delete_character(
    name: str,
    realm: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete de un personaje del usuario."""
    from datetime import datetime, timezone
    char = (
        db.query(Character)
        .filter(
            Character.user_id == current_user.id,
            Character.name == name,
            Character.realm == realm,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not char:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    char.deleted_at = datetime.now(timezone.utc)
    db.commit()

def add_character(
    data: CharacterAddInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Añade un personaje verificado por Blizzard a la BD.
    Llamado desde el frontend después de que el usuario selecciona
    un personaje de su lista de Blizzard.
    """
    # Comprobar que no existe ya
    existing = (
        db.query(Character)
        .filter(
            Character.user_id == current_user.id,
            Character.name == data.name,
            Character.realm == data.realm,
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Este personaje ya está registrado")

    # Convertir class_id de Blizzard a nuestro enum
    wow_class_str = BLIZZARD_CLASS_MAP.get(data.class_id) if data.class_id else None
    wow_class = CharacterClass[wow_class_str] if wow_class_str else None

    # Si el usuario lo marca como main, los demás pasan a ser alts
    if data.is_main:
        db.query(Character).filter(
            Character.user_id == current_user.id
        ).update({"is_main": False, "is_alt": True})

    char = Character(
        user_id=current_user.id,
        name=data.name,
        realm=data.realm,
        wow_class=wow_class,
        is_main=data.is_main,
        is_alt=not data.is_main,
        is_verified=True,   # ← verificado por Blizzard
    )
    db.add(char)
    db.commit()
    db.refresh(char)
    return char
