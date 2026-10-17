import uuid
from sqlalchemy import Column, DateTime, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.user import UserPath


class UserSeasonPath(Base):
    """Itinerario que eligió cada jugador en cada temporada. Una sola elección por temporada."""
    __tablename__ = "user_season_paths"
    __table_args__ = (UniqueConstraint("user_id", "season_id", name="uq_user_season_paths"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    season_id = Column(UUID(as_uuid=True), ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False)
    path = Column(Enum(UserPath, name="userpath", create_type=False), nullable=False)
    chosen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
