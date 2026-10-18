"""default craft order points set by the admin

Revision ID: b4c8e1a7d352
Revises: a9d3e6c1b274
Create Date: 2026-10-18 18:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b4c8e1a7d352"
down_revision: Union[str, Sequence[str], None] = "a9d3e6c1b274"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "craft_reward",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("points_per_order", sa.Integer(), nullable=False, server_default="50"),
    )
    op.execute("INSERT INTO craft_reward (id, points_per_order) VALUES (1, 50)")


def downgrade() -> None:
    op.drop_table("craft_reward")
