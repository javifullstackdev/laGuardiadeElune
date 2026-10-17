"""store guild character names on processed mythic plus runs

Revision ID: a8d3c1f6e409
Revises: f3b9d1e6a427
Create Date: 2026-10-17 21:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a8d3c1f6e409"
down_revision: Union[str, Sequence[str], None] = "f3b9d1e6a427"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("processed_runs", sa.Column("guild_character_names", sa.Text(), nullable=True))
    op.alter_column(
        "point_transactions",
        "reason",
        existing_type=sa.String(length=255),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "point_transactions",
        "reason",
        existing_type=sa.Text(),
        type_=sa.String(length=255),
        existing_nullable=False,
    )
    op.drop_column("processed_runs", "guild_character_names")
