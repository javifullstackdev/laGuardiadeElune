import uuid

from sqlalchemy import Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class RecruitmentApplication(Base):
    """Solicitud pública para entrar en la hermandad."""

    __tablename__ = "recruitment_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(60), nullable=False)
    last_name = Column(String(60), nullable=False)
    reason = Column(Text, nullable=False)
    # pending | read
    status = Column(String(20), nullable=False, server_default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
