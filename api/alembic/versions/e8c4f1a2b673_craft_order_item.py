"""craft order item icon and description

Revision ID: e8c4f1a2b673
Revises: d6b1e8a4c927
Create Date: 2026-10-18 15:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e8c4f1a2b673"
down_revision: Union[str, Sequence[str], None] = "d6b1e8a4c927"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("craft_orders", sa.Column("blizzard_item_id", sa.Integer(), nullable=True))
    op.add_column("craft_orders", sa.Column("item_quality", sa.String(length=32), nullable=True))
    op.add_column("craft_orders", sa.Column("item_icon_url", sa.String(length=500), nullable=True))
    op.add_column("craft_orders", sa.Column("item_description", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("craft_orders", "item_description")
    op.drop_column("craft_orders", "item_icon_url")
    op.drop_column("craft_orders", "item_quality")
    op.drop_column("craft_orders", "blizzard_item_id")
