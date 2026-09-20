"""add character lore fields and relations table

Revision ID: a3f7e9c2b104
Revises: e1f3b84a2c05
Create Date: 2026-09-20 15:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a3f7e9c2b104'
down_revision: Union[str, Sequence[str], None] = 'e1f3b84a2c05'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Campos de lore en characters ──────────────────────────────────────
    op.add_column('characters', sa.Column('biography',   sa.Text(),    nullable=True))
    op.add_column('characters', sa.Column('personality', sa.Text(),    nullable=True))
    op.add_column('characters', sa.Column('appearance',  sa.Text(),    nullable=True))
    op.add_column('characters', sa.Column('level',       sa.Integer(), nullable=True))

    # ── Tabla de relaciones entre personajes ──────────────────────────────
    op.create_table(
        'character_relations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('from_character_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('to_character_id',   postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('relation_type', sa.String(50), nullable=False),
        sa.Column('description',   sa.Text(),     nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['from_character_id'], ['characters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_character_id'],   ['characters.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('from_character_id', 'to_character_id', 'relation_type',
                            name='uq_character_relation'),
    )


def downgrade() -> None:
    op.drop_table('character_relations')
    op.drop_column('characters', 'level')
    op.drop_column('characters', 'appearance')
    op.drop_column('characters', 'personality')
    op.drop_column('characters', 'biography')
