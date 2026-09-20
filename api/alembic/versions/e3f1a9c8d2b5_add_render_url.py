"""add render_url to characters

Revision ID: e3f1a9c8d2b5
Revises: d4e8f2a1b9c6
Create Date: 2026-09-20 17:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e3f1a9c8d2b5'
down_revision: Union[str, Sequence[str], None] = 'd4e8f2a1b9c6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # URL de render obtenida del Character Media API de Blizzard
    op.add_column('characters', sa.Column('render_url', sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column('characters', 'render_url')
