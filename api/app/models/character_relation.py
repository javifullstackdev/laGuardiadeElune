import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

# Tipos de relación disponibles
RELATION_TYPES = [
    "ally",        # Aliado
    "rival",       # Rival
    "family",      # Familiar
    "mentor",      # Mentor
    "apprentice",  # Aprendiz
    "friend",      # Amigo/a
    "enemy",       # Enemigo/a
    "romantic",    # Interés romántico
    "companion",   # Compañero/a de aventuras
]


class CharacterRelation(Base):
    """
    Relación narrativa entre dos personajes del gremio.
    La relación es direccional (from → to) pero se muestra en ambos perfiles.
    Un mismo par de personajes puede tener varios tipos de relación distintos.
    """
    __tablename__ = "character_relations"
    __table_args__ = (
        UniqueConstraint(
            "from_character_id", "to_character_id", "relation_type",
            name="uq_character_relation",
        ),
    )

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    to_character_id   = Column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    relation_type     = Column(String(50), nullable=False)
    description       = Column(Text, nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
