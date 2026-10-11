import uuid
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class ImageRequest(Base):
    """Solicitud de generación de imagen (cara o completa) por un jugador."""

    __tablename__ = "image_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # face | full
    kind = Column(String(20), nullable=False)
    # pending | done | rejected
    status = Column(String(20), nullable=False, server_default="pending")
    # Respuestas del formulario en español
    form_answers = Column(JSONB, nullable=False, server_default="{}", default=dict)
    # Prompt ensamblado listo para generar (image_prompt_data)
    prompt_data = Column(JSONB, nullable=False, server_default="{}", default=dict)
    reference_image_url = Column(String(500), nullable=False)
    player_notes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    character = relationship("Character", lazy="joined")
    user = relationship("User", lazy="joined")
