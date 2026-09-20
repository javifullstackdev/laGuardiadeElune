from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class TitleOut(BaseModel):
    id: UUID
    name: str
    source: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class CharacterResponse(BaseModel):
    """Personaje completo tal como está guardado en nuestra BD."""
    name: str
    realm: str
    wow_class: Optional[str] = None
    race: Optional[str] = None
    role_function: Optional[str] = None
    level: Optional[int] = None
    is_main: bool
    is_alt: bool
    is_verified: bool
    favorite_title: Optional[TitleOut] = None
    # Lore / trasfondo
    biography: Optional[str] = None
    personality: Optional[str] = None
    appearance: Optional[str] = None

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
    race_id: int
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
    race_id: Optional[int] = None
    level: Optional[int] = None
    is_main: bool = False


class SetMainInput(BaseModel):
    name: str
    realm: str


class FavoriteTitleInput(BaseModel):
    title_id: Optional[UUID] = None


class CharacterBioUpdate(BaseModel):
    """Actualización de datos de lore del personaje."""
    biography: Optional[str] = None
    personality: Optional[str] = None
    appearance: Optional[str] = None


class RelationCreate(BaseModel):
    """Datos para crear una relación entre personajes."""
    to_name: str
    to_realm: str
    relation_type: str
    description: Optional[str] = None


class RelationCharacterOut(BaseModel):
    """Resumen de un personaje en una relación."""
    name: str
    realm: str
    wow_class: Optional[str] = None
    owner_username: str

    model_config = {"from_attributes": True, "use_enum_values": True}


class RelationOut(BaseModel):
    """Relación entre dos personajes."""
    id: UUID
    relation_type: str
    description: Optional[str] = None
    direction: str          # "outgoing" | "incoming"
    other: RelationCharacterOut

    model_config = {"from_attributes": True}
