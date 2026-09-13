import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.enums import CharacterClass, CharacterFunction, CharacterProfession

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    achievement_title = Column(String(255), nullable=True)
    achievement_description = Column(Text, nullable=False)
    achievement_icon = Column(String(255), nullable=False)
    account_wide = Column(Boolean, nullable=False)
    character_specific = Column(Boolean, nullable=False)
    repeatable = Column(Boolean, nullable=False)
    wow_class = Column(Enum(CharacterClass, create_type=False), nullable=True)
    role_function = Column(Enum(CharacterFunction, create_type=False), nullable=True)
    profession = Column(Enum(CharacterProfession, create_type=False), nullable=True)
    points_value = Column(Integer, nullable=False)