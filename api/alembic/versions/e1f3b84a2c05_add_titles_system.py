"""add titles system

Revision ID: e1f3b84a2c05
Revises: 0c38b9a36d12
Create Date: 2026-09-20 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e1f3b84a2c05'
down_revision: Union[str, Sequence[str], None] = '86cebbf71f01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Tabla de títulos (catálogo) ─────────────────────────────────────────
    op.create_table(
        'titles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('source', sa.String(50), nullable=False, server_default='custom'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('name', name='uq_titles_name'),
    )

    # ── Tabla pivote personaje ↔ título ────────────────────────────────────
    op.create_table(
        'character_titles',
        sa.Column('character_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('awarded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['character_id'], ['characters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['title_id'], ['titles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('character_id', 'title_id'),
    )

    # ── FK de título favorito en la tabla de personajes ────────────────────
    op.add_column(
        'characters',
        sa.Column('favorite_title_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_characters_favorite_title',
        'characters', 'titles',
        ['favorite_title_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_characters_favorite_title', 'characters', type_='foreignkey')
    op.drop_column('characters', 'favorite_title_id')
    op.drop_table('character_titles')
    op.drop_table('titles')
