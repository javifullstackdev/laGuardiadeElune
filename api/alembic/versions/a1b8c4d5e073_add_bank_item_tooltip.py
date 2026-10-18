"""add bank item tooltip description from Blizzard

Revision ID: a1b8c4d5e073
Revises: f7c0e4a3b962
Create Date: 2026-10-18 03:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b8c4d5e073"
down_revision: Union[str, Sequence[str], None] = "f7c0e4a3b962"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bank_items", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("bank_items", sa.Column("crafting_label", sa.String(length=120), nullable=True))
    op.add_column("bank_requests", sa.Column("item_description", sa.Text(), nullable=True))
    op.add_column("bank_requests", sa.Column("crafting_label", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("bank_requests", "crafting_label")
    op.drop_column("bank_requests", "item_description")
    op.drop_column("bank_items", "crafting_label")
    op.drop_column("bank_items", "description")
