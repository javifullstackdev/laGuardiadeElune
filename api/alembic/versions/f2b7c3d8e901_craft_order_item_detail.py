"""craft order item slot line

Revision ID: f2b7c3d8e901
Revises: e8c4f1a2b673
Create Date: 2026-10-18 15:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f2b7c3d8e901"
down_revision: Union[str, Sequence[str], None] = "e8c4f1a2b673"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("craft_orders", sa.Column("item_detail", sa.String(length=160), nullable=True))


def downgrade() -> None:
    op.drop_column("craft_orders", "item_detail")
