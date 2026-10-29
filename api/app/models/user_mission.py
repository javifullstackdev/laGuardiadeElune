import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class UserMission(Base):
    """Misión ya cobrada. Una vez por jugador."""

    __tablename__ = "user_missions"
    __table_args__ = (UniqueConstraint("user_id", "mission_key", name="uq_user_missions"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mission_key = Column(String(64), nullable=False)
    point_transaction_id = Column(
        UUID(as_uuid=True), ForeignKey("point_transactions.id", ondelete="SET NULL"), nullable=True
    )
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
