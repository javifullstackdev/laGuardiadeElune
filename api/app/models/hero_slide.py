import uuid
from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class HeroSlide(Base):
    __tablename__ = "hero_slides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # story | character | custom
    kind = Column(String(20), nullable=False)
    story_id = Column(UUID(as_uuid=True), ForeignKey("character_stories.id", ondelete="CASCADE"), nullable=True)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=True)
    kicker = Column(String(80), nullable=True)
    title = Column(String(255), nullable=True)
    subtitle = Column(Text, nullable=True)
    image_url = Column(String(1000), nullable=True)
    href = Column(String(500), nullable=True)
    cta_label = Column(String(80), nullable=True)
    focus_x = Column(Integer, nullable=False, server_default="50")
    focus_y = Column(Integer, nullable=False, server_default="28")
    sort_order = Column(Integer, nullable=False, server_default="0")
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
