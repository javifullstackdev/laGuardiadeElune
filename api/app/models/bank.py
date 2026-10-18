import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class BankItem(Base):
    """Objeto del catálogo del banco: valor de puntos actual (oferta/demanda)."""

    __tablename__ = "bank_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blizzard_item_id = Column(Integer, nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    quality = Column(String(32), nullable=True)
    icon_url = Column(String(500), nullable=True)
    points = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class BankRequest(Base):
    """Ingreso o retirada declarada por un miembro."""

    __tablename__ = "bank_requests"
    __table_args__ = (
        Index("ix_bank_requests_status_kind", "status", "kind"),
        Index("ix_bank_requests_user_created", "user_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    character_name = Column(String(24), nullable=True)
    character_realm = Column(String(64), nullable=True)
    # deposit | withdrawal
    kind = Column(String(16), nullable=False)
    # pending | approved | rejected | completed
    status = Column(String(16), nullable=False, server_default="pending")
    blizzard_item_id = Column(Integer, nullable=False)
    item_name = Column(String(255), nullable=False)
    item_quality = Column(String(32), nullable=True)
    item_icon_url = Column(String(500), nullable=True)
    quantity = Column(Integer, nullable=False)
    note = Column(Text, nullable=True)
    estimated_points = Column(Integer, nullable=True)
    awarded_points = Column(Integer, nullable=True)
    point_transaction_id = Column(
        UUID(as_uuid=True), ForeignKey("point_transactions.id", ondelete="SET NULL"), nullable=True
    )
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id], lazy="joined")
    resolver = relationship("User", foreign_keys=[resolved_by], lazy="joined")
