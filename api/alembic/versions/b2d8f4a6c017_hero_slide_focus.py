"""carousel image focal point

Revision ID: b2d8f4a6c017
Revises: a9c3e7f1b046
Create Date: 2026-09-25 20:16:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "b2d8f4a6c017"
down_revision: Union[str, Sequence[str], None] = "a9c3e7f1b046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hero_slides", sa.Column("focus_x", sa.Integer(), nullable=False, server_default="50"))
    op.add_column("hero_slides", sa.Column("focus_y", sa.Integer(), nullable=False, server_default="28"))


def downgrade() -> None:
    op.drop_column("hero_slides", "focus_y")
    op.drop_column("hero_slides", "focus_x")
