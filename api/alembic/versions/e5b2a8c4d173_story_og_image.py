"""story image used when sharing on WhatsApp and X

Revision ID: e5b2a8c4d173
Revises: d4a9c2e7b815
Create Date: 2026-11-03 09:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e5b2a8c4d173"
down_revision: Union[str, Sequence[str], None] = "d4a9c2e7b815"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("character_stories", sa.Column("og_image_url", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("character_stories", "og_image_url")
