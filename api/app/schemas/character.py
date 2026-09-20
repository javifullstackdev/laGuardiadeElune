from pydantic import BaseModel, model_validator
from typing import Optional
from uuid import UUID

BLIZZARD_REGION = "eu"  # ajusta si el servidor usa otra región


class TitleOut(BaseModel):
    id: UUID
    name: str
    source: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class CharacterResponse(BaseModel):
    """Personaje completo tal como está guardado en nuestra BD."""
    game: str
    name: str
    surname: Optional[str] = None
    prefix_title: Optional[str] = None
    realm: str
    blizzard_character_id: Optional[int] = None
    # Avatares
    render_url:        Optional[str] = None   # URL directa del Character Media API
    custom_avatar_url: Optional[str] = None   # imagen aprobada (ruta /static/...)
    pending_avatar_url: Optional[str] = None  # pendiente de aprobación
    # Campo calculado: la imagen a mostrar
    avatar_url: Optional[str] = None
    wow_class: Optional[str] = None
    race: Optional[str] = None
    faction: Optional[str] = None
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
    # Datos personales de lore
    origin: Optional[str] = None
    age_lore: Optional[int] = None
    residence: Optional[str] = None

    model_config = {
        "from_attributes": True,
        "use_enum_values": True,
    }

    @model_validator(mode="after")
    def compute_avatar_url(self) -> "CharacterResponse":
        """Prioridad: imagen custom aprobada > render Blizzard (Character Media API) > null."""
        if self.custom_avatar_url:
            self.avatar_url = f"http://localhost:8000/static/{self.custom_avatar_url}"
        elif self.render_url:
            self.avatar_url = self.render_url
        return self


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
    """Datos para añadir un personaje verificado por Blizzard."""
    name: str
    realm: str
    game: str = "retail"
    blizzard_character_id: Optional[int] = None
    class_id: Optional[int] = None
    race_id: Optional[int] = None
    level: Optional[int] = None
    faction: Optional[str] = None
    surname: Optional[str] = None
    is_main: bool = False


class SetMainInput(BaseModel):
    name: str
    realm: str


class FavoriteTitleInput(BaseModel):
    title_id: Optional[UUID] = None


class CharacterBioUpdate(BaseModel):
    """Actualiza todos los campos editables por el jugador: identidad, trasfondo y datos personales."""
    # Identidad
    surname:      Optional[str] = None
    prefix_title: Optional[str] = None
    # Trasfondo narrativo
    biography:    Optional[str] = None
    personality:  Optional[str] = None
    appearance:   Optional[str] = None
    # Datos personales de lore
    origin:       Optional[str] = None
    age_lore:     Optional[int] = None
    residence:    Optional[str] = None


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
