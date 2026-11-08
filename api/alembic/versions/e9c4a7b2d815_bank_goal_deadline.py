"""deadline for the guild bank goal

Revision ID: e9c4a7b2d815
Revises: c8e2a4b1d705
Create Date: 2026-11-08 20:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e9c4a7b2d815"
down_revision: Union[str, Sequence[str], None] = "c8e2a4b1d705"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bank_gold_settings", sa.Column("ends_on", sa.Date(), nullable=True))
    op.execute("UPDATE bank_gold_settings SET ends_on = DATE '2026-11-30' WHERE ends_on IS NULL")
    op.alter_column("bank_gold_settings", "ends_on", nullable=False)


def downgrade() -> None:
    op.drop_column("bank_gold_settings", "ends_on")
