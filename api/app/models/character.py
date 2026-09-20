import uuid
import enum
from sqlalchemy import Column, String, DateTime, Boolean, Enum, func, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.enums import CharacterClass, CharacterFunction, CharacterProfession

class CharacterRace(enum.Enum):
    HUMAN = "human"
    ORC = "orc"
    MAGHAR_ORC = "maghar_orc"
    GOBLIN = "goblin"
    VULPERA = "vulpera"
    DWARF = "dwarf"
    NIGHT_ELF = "night_elf"
    UNDEAD = "undead"
    TAUREN = "tauren"
    GNOME = "gnome"
    TROLL = "troll"
    BLOOD_ELF = "blood_elf"
    DRAENEI = "draenei"
    WORGEN = "worgen"
    PANDAREN = "pandaren"
    NIGHTBORNE = "nightborne"
    HIGHMOUNTAIN_TAUREN = "highmountain_tauren"
    VOID_ELF = "void_elf"
    DARK_IRON_DWARF = "dark_iron_dwarf"
    KUL_TIRAN = "kul_tiran"
    MECHAGNOME = "mechagnome"
    DRACTHYR = "dracthyr"
    ZANDALARI = "zandalari"
    LIGHTFORGED = "lightforged"

class Character(Base):
    __tablename__ = "characters"
    __table_args__ = (
        UniqueConstraint("user_id", "name", "realm", name="uq_character_user_name_realm"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    realm = Column(String(255), nullable=False)
    is_main = Column(Boolean, nullable=False, default=False)
    is_alt = Column(Boolean, nullable=False, default=False)
    wow_class = Column(Enum(CharacterClass), nullable=True)
    race = Column(Enum(CharacterRace), nullable=True)
    role_function = Column(Enum(CharacterFunction), nullable=True)
    profession = Column(Enum(CharacterProfession), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)