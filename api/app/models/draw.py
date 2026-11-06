import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class GuildDraw(Base):
    """Peña privada: un miembro compra el décimo y el resto se apunta a una parte igual."""

    __tablename__ = "guild_draws"
    __table_args__ = (Index("ix_guild_draws_status_draw_at", "status", "draw_at"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(160), nullable=False)
    summary = Column(Text, nullable=True)
    price_cents = Column(Integer, nullable=False)
    draw_at = Column(DateTime(timezone=True), nullable=False)
    signup_closes_at = Column(DateTime(timezone=True), nullable=False)
    payment_due_at = Column(DateTime(timezone=True), nullable=False)
    # open: lista viva. closed: cuotas fijadas. drawn: ya se celebró. cancelled.
    status = Column(String(16), nullable=False, server_default="open")
    ticket_number = Column(String(32), nullable=True)
    ticket_series = Column(String(32), nullable=True)
    bizum_phone = Column(String(20), nullable=False)
    bizum_name = Column(String(120), nullable=False)
    image_url = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    organizer = relationship("User", foreign_keys=[organizer_id], lazy="joined")
    entries = relationship("GuildDrawEntry", back_populates="draw", cascade="all, delete-orphan")


class GuildDrawEntry(Base):
    """Compromiso de un miembro. La cuota en céntimos se guarda al cerrar la lista."""

    __tablename__ = "guild_draw_entries"
    __table_args__ = (UniqueConstraint("draw_id", "user_id", name="uq_guild_draw_entry"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    draw_id = Column(UUID(as_uuid=True), ForeignKey("guild_draws.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=False)
    share_cents = Column(Integer, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    dropped_at = Column(DateTime(timezone=True), nullable=True)

    draw = relationship("GuildDraw", back_populates="entries")
    user = relationship("User", lazy="joined")
