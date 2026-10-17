"""add blizzard_title_id to titles

Revision ID: c3e8a1d5f7b2
Revises: b7d2a9c4e611
Create Date: 2026-10-17 12:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3e8a1d5f7b2"
down_revision: Union[str, Sequence[str], None] = "b7d2a9c4e611"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("titles", sa.Column("blizzard_title_id", sa.Integer(), nullable=True))
    op.create_unique_constraint(
        "uq_titles_blizzard_title_id", "titles", ["blizzard_title_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_titles_blizzard_title_id", "titles", type_="unique")
    op.drop_column("titles", "blizzard_title_id")
