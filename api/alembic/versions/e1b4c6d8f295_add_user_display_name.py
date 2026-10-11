"""add display_name to users

Revision ID: e1b4c6d8f295
Revises: d9a3b5c7e184
Create Date: 2026-10-11 02:35:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "e1b4c6d8f295"
down_revision: Union[str, Sequence[str], None] = "d9a3b5c7e184"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "display_name")
