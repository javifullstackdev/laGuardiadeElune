"""add avatar fields and blizzard_character_id to characters

Revision ID: d4e8f2a1b9c6
Revises: c7d3f9b1e482
Create Date: 2026-09-20 16:45:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd4e8f2a1b9c6'
down_revision: Union[str, Sequence[str], None] = 'c7d3f9b1e482'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ID de personaje en Blizzard (necesario para construir la URL del render)
    op.add_column('characters', sa.Column('blizzard_character_id', sa.BigInteger(), nullable=True))
    # Imagen personalizada aprobada por admin (ruta relativa a /static)
    op.add_column('characters', sa.Column('custom_avatar_url',  sa.String(500), nullable=True))
    # Imagen pendiente de aprobación
    op.add_column('characters', sa.Column('pending_avatar_url', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('characters', 'pending_avatar_url')
    op.drop_column('characters', 'custom_avatar_url')
    op.drop_column('characters', 'blizzard_character_id')
