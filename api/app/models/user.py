import uuid
import enum
from sqlalchemy import Boolean, Column, String, DateTime, Integer, Date, Enum, Text, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class UserRole(enum.Enum):
    ADMIN = "admin"
    OFFICER = "officer"
    MEMBER = "member"

class UserPath(enum.Enum):
    COMPETITIVE = "competitive"
    CAMPAIGN = "campaign"
    HYBRID = "hybrid"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(255), nullable=False)  # sync Discord (login /me)
    # Apodo visible en ranking (editable por admin; no lo pisa Discord)
    display_name = Column(String(255), nullable=True)
    discord_id = Column(String(255), nullable=False, unique=True)
    guild_title = Column(String(255), nullable=False)
    total_points = Column(Integer, nullable=False, default=0)
    birthday = Column(Date, nullable=True)
    avatar_url = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.MEMBER)
    path = Column(Enum(UserPath), nullable=False, default=UserPath.COMPETITIVE)
    # Tenía híbrido en la temporada en curso. Al elegir de nuevo se queda solo
    # con míticas+ (competitivo) o con el banco (artesanía y farmeo).
    hybrid_resplit_pending = Column(Boolean, nullable=False, server_default="false", default=False)
    # Battle.net — se rellena cuando el usuario conecta su cuenta
    blizzard_id = Column(String(255), nullable=True, unique=True)
    blizzard_battletag = Column(String(255), nullable=True)
    blizzard_access_token = Column(Text, nullable=True)
    blizzard_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)