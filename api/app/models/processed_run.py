import uuid
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ProcessedRun(Base):
    """Partida externa (p. ej. una M+ de Raider.io) ya puntuada. Evita puntuarla dos veces."""
    __tablename__ = "processed_runs"
    __table_args__ = (UniqueConstraint("source", "external_id", name="uq_processed_runs_source_external"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(String(32), nullable=False)
    # Raider.io: "<season>:<keystone_run_id>"; el id solo es único dentro de su temporada
    external_id = Column(String(64), nullable=False)
    dungeon = Column(String(255), nullable=False)
    mythic_level = Column(Integer, nullable=False)
    timed = Column(Boolean, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=False)
    guild_member_count = Column(Integer, nullable=False)
    # Nombres en el grupo que están en el roster de Blizzard, aunque no tengan ficha en la web
    guild_character_names = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
