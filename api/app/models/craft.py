import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class CharacterProfessionSkill(Base):
    """Última lectura de una profesión de Blizzard para un personaje."""

    __tablename__ = "character_profession_skills"
    __table_args__ = (
        UniqueConstraint("character_id", "blizzard_profession_id", name="uq_character_profession"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    blizzard_profession_id = Column(Integer, nullable=False)
    name = Column(String(120), nullable=False)
    skill_points = Column(Integer, nullable=False, server_default="0")
    max_skill_points = Column(Integer, nullable=False, server_default="0")
    tier_name = Column(String(120), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CraftOrder(Base):
    """Pedido de un objeto que solo fabrica una profesión."""

    __tablename__ = "craft_orders"
    __table_args__ = (
        Index("ix_craft_orders_status_created", "status", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    profession_id = Column(Integer, nullable=False)
    profession_name = Column(String(120), nullable=False)
    item_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, server_default="1")
    note = Column(Text, nullable=True)
    # open | claimed | completed | cancelled
    status = Column(String(16), nullable=False, server_default="open")
    crafter_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    crafter_character_name = Column(String(24), nullable=True)
    crafter_character_realm = Column(String(64), nullable=True)
    awarded_points = Column(Integer, nullable=True)
    point_transaction_id = Column(
        UUID(as_uuid=True), ForeignKey("point_transactions.id", ondelete="SET NULL"), nullable=True
    )
    admin_note = Column(Text, nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    claimed_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    requester = relationship("User", foreign_keys=[requester_id], lazy="joined")
    crafter = relationship("User", foreign_keys=[crafter_user_id], lazy="joined")
