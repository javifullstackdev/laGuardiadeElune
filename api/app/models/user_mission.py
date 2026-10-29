import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class UserMission(Base):
    """Misión ya cobrada. La ficha, una vez por personaje. El resto, una vez por jugador."""

    __tablename__ = "user_missions"
    __table_args__ = (
        Index(
            "uq_user_missions_character",
            "user_id",
            "mission_key",
            "character_id",
            unique=True,
            postgresql_where=text("character_id IS NOT NULL"),
        ),
        Index(
            "uq_user_missions_player",
            "user_id",
            "mission_key",
            unique=True,
            postgresql_where=text("character_id IS NULL"),
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    character_id = Column(
        UUID(as_uuid=True), ForeignKey("characters.id", ondelete="SET NULL"), nullable=True
    )
    mission_key = Column(String(64), nullable=False)
    point_transaction_id = Column(
        UUID(as_uuid=True), ForeignKey("point_transactions.id", ondelete="SET NULL"), nullable=True
    )
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
