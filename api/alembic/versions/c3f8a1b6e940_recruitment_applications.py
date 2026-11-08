"""public recruitment applications

Revision ID: c3f8a1b6e940
Revises: a4d8e2c6b917
Create Date: 2026-11-08 23:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c3f8a1b6e940"
down_revision: Union[str, Sequence[str], None] = "a4d8e2c6b917"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    names = set(sa.inspect(bind).get_table_names())
    if "recruitment_applications" in names:
        return
    op.create_table(
        "recruitment_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("first_name", sa.String(length=60), nullable=False),
        sa.Column("last_name", sa.String(length=60), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("recruitment_applications")
