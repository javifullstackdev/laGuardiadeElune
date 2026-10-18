"""link mailbox notices to craft orders

Revision ID: a9d3e6c1b274
Revises: f2b7c3d8e901
Create Date: 2026-10-18 16:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a9d3e6c1b274"
down_revision: Union[str, Sequence[str], None] = "f2b7c3d8e901"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column("craft_order_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_notifications_craft_order",
        "notifications",
        "craft_orders",
        ["craft_order_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_notifications_craft_order", "notifications", type_="foreignkey")
    op.drop_column("notifications", "craft_order_id")
