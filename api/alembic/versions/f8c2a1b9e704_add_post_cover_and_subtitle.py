"""add post cover_url and subtitle, merge alembic heads

Revision ID: f8c2a1b9e704
Revises: 005efd3d67f4, e3f1a9c8d2b5
Create Date: 2026-09-20 21:25:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "f8c2a1b9e704"
down_revision: Union[str, Sequence[str], None] = ("005efd3d67f4", "e3f1a9c8d2b5")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("subtitle", sa.String(500), nullable=True))
    op.add_column("posts", sa.Column("cover_url", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("posts", "cover_url")
    op.drop_column("posts", "subtitle")
