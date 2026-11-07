"""in-game images required on a character sheet

Revision ID: b2d8e4a1c906
Revises: a7c3e9b1d640
Create Date: 2026-11-07 02:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2d8e4a1c906"
down_revision: Union[str, Sequence[str], None] = "a7c3e9b1d640"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("characters", sa.Column("sheet_front_url", sa.String(length=500), nullable=True))
    op.add_column("characters", sa.Column("sheet_back_url", sa.String(length=500), nullable=True))
    op.add_column("characters", sa.Column("sheet_face_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("characters", "sheet_face_url")
    op.drop_column("characters", "sheet_back_url")
    op.drop_column("characters", "sheet_front_url")
