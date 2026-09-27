"""add gender to characters

Revision ID: a4c8e2f7b019
Revises: c3a7f1e8d046
Create Date: 2026-09-27 12:35:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "a4c8e2f7b019"
down_revision: Union[str, Sequence[str], None] = "d8e2a4c1b073"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("characters", sa.Column("gender", sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column("characters", "gender")
