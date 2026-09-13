import uuid
import enum
from sqlalchemy import Column, String, DateTime, Integer, Date, Enum, func
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
    username = Column(String(255), nullable=False)
    discord_id = Column(String(255), nullable=False, unique=True)
    guild_title = Column(String(255), nullable=False)
    total_points = Column(Integer, nullable=False, default=0)
    birthday = Column(Date, nullable=True)
    avatar_url = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.MEMBER)
    path = Column(Enum(UserPath), nullable=False, default=UserPath.HYBRID)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)