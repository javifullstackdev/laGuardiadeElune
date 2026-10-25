"""story subtitle under the title

Revision ID: f1a6c8e2b304
Revises: e7c3a9b1d048
Create Date: 2026-10-25 20:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f1a6c8e2b304"
down_revision: Union[str, Sequence[str], None] = "e7c3a9b1d048"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("character_stories", sa.Column("subtitle", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("character_stories", "subtitle")
