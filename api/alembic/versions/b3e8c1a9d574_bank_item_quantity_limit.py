"""bank item quantity cap, decremented when a deposit is accepted

Revision ID: b3e8c1a9d574
Revises: f1a6c8e2b304
Create Date: 2026-10-29 20:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b3e8c1a9d574"
down_revision: Union[str, Sequence[str], None] = "f1a6c8e2b304"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bank_items", sa.Column("quantity_limit", sa.Integer(), nullable=True))
    op.add_column(
        "bank_items",
        sa.Column("quantity_filled", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("bank_items", "quantity_filled")
    op.drop_column("bank_items", "quantity_limit")
