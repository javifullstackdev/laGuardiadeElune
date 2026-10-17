"""add admin_note to point_transactions

Revision ID: b6c1d8e4a520
Revises: a8d3c1f6e409
Create Date: 2026-10-17 21:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b6c1d8e4a520"
down_revision: Union[str, Sequence[str], None] = "a8d3c1f6e409"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("point_transactions", sa.Column("admin_note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("point_transactions", "admin_note")
