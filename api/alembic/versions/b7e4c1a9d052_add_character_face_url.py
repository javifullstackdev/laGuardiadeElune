"""add face_url to characters

Revision ID: b7e4c1a9d052
Revises: f2a9c4d8e1b7
Create Date: 2026-10-11 00:10:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "b7e4c1a9d052"
down_revision: Union[str, Sequence[str], None] = "f2a9c4d8e1b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("characters", sa.Column("face_url", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("characters", "face_url")
