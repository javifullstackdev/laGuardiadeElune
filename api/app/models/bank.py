import uuid
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class BankItem(Base):
    """Objeto del catálogo del banco: valor de puntos actual (oferta/demanda)."""

    __tablename__ = "bank_items"
    __table_args__ = (
        UniqueConstraint("blizzard_item_id", "material_grade", name="uq_bank_items_blizzard_grade"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blizzard_item_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    quality = Column(String(32), nullable=True)
    # none | bronze | silver | gold — rango de profesión (TWW/Midnight)
    material_grade = Column(String(16), nullable=False, server_default="none")
    icon_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    crafting_label = Column(String(120), nullable=True)
    # Puntos por lote: 1 = unidad, 10 o 100 para mats baratos
    points = Column(Integer, nullable=False, server_default="0")
    lot_size = Column(Integer, nullable=False, server_default="1")
    # None = sin cupo. Si hay cupo, quantity_filled crece al aceptar cada ingreso.
    quantity_limit = Column(Integer, nullable=True)
    quantity_filled = Column(Integer, nullable=False, server_default="0")
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
    material_grade = Column(String(16), nullable=False, server_default="none")
    item_icon_url = Column(String(500), nullable=True)
    item_description = Column(Text, nullable=True)
    crafting_label = Column(String(120), nullable=True)
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


class BankGoldSettings(Base):
    """Tarifa del oro de Warcraft Forever. Una sola fila."""

    __tablename__ = "bank_gold_settings"

    id = Column(Integer, primary_key=True)
    # 1 punto por cada tantas platas. 10 platas = 1 punto al empezar.
    silver_per_point = Column(Integer, nullable=False, server_default="10")
    # Objetivo en cobres. 100 de oro = 1_000_000 cobres.
    goal_copper = Column(BigInteger, nullable=False, server_default="1000000")


class BankGoldDeposit(Base):
    """Oro de Forever declarado por un miembro. Los puntos esperan a que el líder lo confirme."""

    __tablename__ = "bank_gold_deposits"
    __table_args__ = (
        Index("ix_bank_gold_deposits_status_created", "status", "created_at"),
        Index("ix_bank_gold_deposits_user_created", "user_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    character_name = Column(String(64), nullable=False)
    character_realm = Column(String(64), nullable=False)
    copper = Column(BigInteger, nullable=False)
    # pending | approved | rejected
    status = Column(String(16), nullable=False, server_default="pending")
    estimated_points = Column(Integer, nullable=False, server_default="0")
    awarded_points = Column(Integer, nullable=True)
    point_transaction_id = Column(
        UUID(as_uuid=True), ForeignKey("point_transactions.id", ondelete="SET NULL"), nullable=True
    )
    note = Column(Text, nullable=True)
    admin_note = Column(Text, nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id], lazy="select")
