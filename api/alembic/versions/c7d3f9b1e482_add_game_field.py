"""add game field and update unique constraint

Revision ID: c7d3f9b1e482
Revises: b5c2d8f4a7e3
Create Date: 2026-09-20 16:30:00.000000

Allows a player to have the same character name in both Retail and
Warcraft Forever by including 'game' in the unique constraint.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c7d3f9b1e482'
down_revision: Union[str, Sequence[str], None] = 'b5c2d8f4a7e3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Añadir columna game con default 'retail' para las filas existentes
    op.add_column(
        'characters',
        sa.Column('game', sa.String(20), nullable=False, server_default='retail'),
    )

    # 2. Sustituir la clave única antigua por la nueva que incluye game
    op.drop_constraint('uq_character_user_name_realm', 'characters', type_='unique')
    op.create_unique_constraint(
        'uq_character_user_name_realm_game',
        'characters',
        ['user_id', 'name', 'realm', 'game'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_character_user_name_realm_game', 'characters', type_='unique')
    op.create_unique_constraint(
        'uq_character_user_name_realm',
        'characters',
        ['user_id', 'name', 'realm'],
    )
    op.drop_column('characters', 'game')
