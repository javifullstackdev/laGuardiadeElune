from sqlalchemy import Column, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class CharacterTitle(Base):
    """
    Tabla pivote many-to-many: qué títulos ha ganado cada personaje.
    """
    __tablename__ = "character_titles"

    character_id = Column(
        UUID(as_uuid=True),
        ForeignKey("characters.id", ondelete="CASCADE"),
        primary_key=True,
    )
    title_id = Column(
        UUID(as_uuid=True),
        ForeignKey("titles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    awarded_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
