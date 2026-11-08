"""optional two-line title for story cards

Revision ID: a4d8e2c6b917
Revises: e9c4a7b2d815
Create Date: 2026-11-08 20:45:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a4d8e2c6b917"
down_revision: Union[str, Sequence[str], None] = "e9c4a7b2d815"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    names = {col["name"] for col in sa.inspect(bind).get_columns("character_stories")}
    if "card_title" not in names:
        op.add_column("character_stories", sa.Column("card_title", sa.String(length=160), nullable=True))


def downgrade() -> None:
    op.drop_column("character_stories", "card_title")
