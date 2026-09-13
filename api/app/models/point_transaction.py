import uuid
from sqlalchemy import Column, ForeignKey, DateTime, func, Integer, String, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.enums import EventCategory

class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=True)
    amount = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    week_start = Column(DateTime(timezone=True), nullable=False)
    season_id = Column(UUID(as_uuid=True), ForeignKey("seasons.id"), nullable=False)
    event_category = Column(Enum(EventCategory), nullable=False)