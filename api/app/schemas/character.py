from pydantic import BaseModel
from typing import Optional


class CharacterResponse(BaseModel):
    """Personaje tal como está guardado en nuestra BD."""
    name: str
    realm: str
    wow_class: Optional[str] = None
    role_function: Optional[str] = None
    is_main: bool
    is_alt: bool
    is_verified: bool

    model_config = {
        "from_attributes": True,
        "use_enum_values": True,
    }


class BlizzardCharacterOut(BaseModel):
    """Personaje obtenido en tiempo real de la API de Blizzard."""
    name: str
    realm: str
    realm_name: str
    class_id: int
    class_name: str
    race_name: str
    level: int
    faction: str
    blizzard_character_id: int


class CharacterAddInput(BaseModel):
    """Datos para añadir un personaje verificado."""
    name: str
    realm: str
    class_id: Optional[int] = None
    is_main: bool = False


class SetMainInput(BaseModel):
    """Datos para marcar un personaje como main."""
    name: str
    realm: str
