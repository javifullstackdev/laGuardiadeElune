import uuid
from sqlalchemy import Column, ForeignKey, DateTime, func, Index, Integer, Text, Boolean, Enum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.enums import EventCategory
from app.models.processed_run import ProcessedRun  # noqa: F401 — registra la tabla para la FK

class PointTransaction(Base):
    __tablename__ = "point_transactions"
    __table_args__ = (
        UniqueConstraint("user_id", "processed_run_id", name="uq_point_transactions_user_run"),
        Index("ix_point_transactions_user_week", "user_id", "week_start"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=True)
    amount = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # server_default="true" → PostgreSQL lo rellena automáticamente, incluso con SQL raw
    active = Column(Boolean, server_default="true", nullable=False)
    week_start = Column(DateTime(timezone=True), nullable=True)
    season_id = Column(UUID(as_uuid=True), ForeignKey("seasons.id"), nullable=True)
    event_category = Column(Enum(EventCategory), nullable=False)
    # Cuándo ocurrió el evento (fin de la M+, etc.); NULL = created_at
    occurred_at = Column(DateTime(timezone=True), nullable=True)
    # Sujeto al tope semanal del itinerario. Lo que da un admin (web o Bubu) va fuera del tope
    weekly_capped = Column(Boolean, server_default="false", nullable=False)
    # Solo en eventos con tope: parte de `amount` que cabe en el tope de su semana (0..amount)
    counted_amount = Column(Integer, nullable=True)
    processed_run_id = Column(
        UUID(as_uuid=True), ForeignKey("processed_runs.id", ondelete="SET NULL"), nullable=True
    )
    # Motivo del último ajuste o anulación de un admin
    admin_note = Column(Text, nullable=True)
