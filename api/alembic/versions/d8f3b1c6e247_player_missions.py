"""player missions, outside the weekly itinerary cap

Revision ID: d8f3b1c6e247
Revises: c7e2a4b9d816
Create Date: 2026-10-29 21:15:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d8f3b1c6e247"
down_revision: Union[str, Sequence[str], None] = "c7e2a4b9d816"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE eventcategory ADD VALUE IF NOT EXISTS 'MISSION'")
    op.create_table(
        "user_missions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mission_key", sa.String(64), nullable=False),
        sa.Column("point_transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("point_transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "mission_key", name="uq_user_missions"),
    )


def downgrade() -> None:
    op.drop_table("user_missions")
