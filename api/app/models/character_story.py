import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class CharacterStory(Base):
    __tablename__ = "character_stories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    cover_url = Column(String(1000), nullable=True)
    biography = Column(Text, nullable=True)
    personality = Column(Text, nullable=True)
    appearance = Column(Text, nullable=True)
    # pending | approved | rejected
    status = Column(String(20), nullable=False, server_default="pending")
    rejection_reason = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    eremita_override = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ContentLike(Base):
    __tablename__ = "content_likes"
    __table_args__ = (
        UniqueConstraint("user_id", "target_type", "target_id", name="uq_content_like"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(20), nullable=False)  # post | story
    target_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
