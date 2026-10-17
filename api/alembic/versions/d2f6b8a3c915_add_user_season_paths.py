"""add user_season_paths and seasons.blizzard_season_id

Revision ID: d2f6b8a3c915
Revises: c3e8a1d5f7b2
Create Date: 2026-10-17 14:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d2f6b8a3c915"
down_revision: Union[str, Sequence[str], None] = "c3e8a1d5f7b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("seasons", sa.Column("blizzard_season_id", sa.Integer(), nullable=True))
    op.create_unique_constraint(
        "uq_seasons_blizzard_season_id", "seasons", ["blizzard_season_id"]
    )
    op.create_table(
        "user_season_paths",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("season_id", sa.UUID(), nullable=False),
        sa.Column(
            "path",
            postgresql.ENUM("COMPETITIVE", "CAMPAIGN", "HYBRID", name="userpath", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "chosen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "season_id", name="uq_user_season_paths"),
    )


def downgrade() -> None:
    op.drop_table("user_season_paths")
    op.drop_constraint("uq_seasons_blizzard_season_id", "seasons", type_="unique")
    op.drop_column("seasons", "blizzard_season_id")
