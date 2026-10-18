"""add bank item lot size (1, 10 or 100)

Revision ID: f7c0e4a3b962
Revises: e6b9d3f2a851
Create Date: 2026-10-18 03:12:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f7c0e4a3b962"
down_revision: Union[str, Sequence[str], None] = "e6b9d3f2a851"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bank_items",
        sa.Column("lot_size", sa.Integer(), server_default="1", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("bank_items", "lot_size")
