"""fix published_at server_default

Revision ID: a6b62f27b830
Revises: 1a7319905300
Create Date: 2026-09-12 15:14:18.456833

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6b62f27b830'
down_revision: Union[str, Sequence[str], None] = '1a7319905300'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'posts',
        'published_at',
        server_default=sa.text('now()'),
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=False
    )


def downgrade() -> None:
    op.alter_column(
        'posts',
        'published_at',
        server_default=None,
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=False
    )
