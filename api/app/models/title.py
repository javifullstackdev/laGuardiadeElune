import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Title(Base):
    """
    Catálogo de títulos que pueden ostentar los personajes.
    Cada título tiene un origen: logro de hermandad, puntos, rango o personalizado.
    """
    __tablename__ = "titles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    # Origen: achievement | points | rank | custom
    source = Column(String(50), nullable=False, default="custom")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
