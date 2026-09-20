"""add identity and personal data fields to characters

Revision ID: b5c2d8f4a7e3
Revises: a3f7e9c2b104
Create Date: 2026-09-20 16:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b5c2d8f4a7e3'
down_revision: Union[str, Sequence[str], None] = 'a3f7e9c2b104'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('characters', sa.Column('surname',      sa.String(100),  nullable=True))
    op.add_column('characters', sa.Column('prefix_title', sa.String(100),  nullable=True))
    op.add_column('characters', sa.Column('faction',      sa.String(20),   nullable=True))
    op.add_column('characters', sa.Column('origin',       sa.String(255),  nullable=True))
    op.add_column('characters', sa.Column('age_lore',     sa.Integer(),    nullable=True))
    op.add_column('characters', sa.Column('residence',    sa.String(255),  nullable=True))


def downgrade() -> None:
    op.drop_column('characters', 'residence')
    op.drop_column('characters', 'age_lore')
    op.drop_column('characters', 'origin')
    op.drop_column('characters', 'faction')
    op.drop_column('characters', 'prefix_title')
    op.drop_column('characters', 'surname')
