import uuid
from sqlalchemy import Column, PrimaryKeyConstraint, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class UserAchievement(Base):
    __tablename__ = "user_achievements"

    __table_args__ = (
        PrimaryKeyConstraint("user_id", "achievement_id"),
    )

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    achievement_id = Column(UUID(as_uuid=True), ForeignKey("achievements.id"), nullable=False)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=True)
    earned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)