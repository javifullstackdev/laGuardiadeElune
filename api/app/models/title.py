import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Title(Base):
    """
    Catálogo de títulos y antetítulos.
    slot=title va debajo del nombre; slot=prefix va delante.
    """
    __tablename__ = "titles"
    __table_args__ = (
        UniqueConstraint("name", "slot", name="uq_titles_name_slot"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slot = Column(String(20), nullable=False, server_default="title")
    # Origen: achievement | points | rank | custom
    source = Column(String(50), nullable=False, default="custom")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
