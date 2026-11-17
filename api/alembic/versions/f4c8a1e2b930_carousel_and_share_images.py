"""separate still images for the carousel and for sharing

Revision ID: f4c8a1e2b930
Revises: c3f8a1b6e940
Create Date: 2026-11-17 09:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f4c8a1e2b930"
down_revision: Union[str, Sequence[str], None] = "c3f8a1b6e940"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("character_stories", sa.Column("carousel_image_url", sa.String(length=1000), nullable=True))
    op.add_column("characters", sa.Column("carousel_image_url", sa.String(length=1000), nullable=True))
    op.add_column("characters", sa.Column("og_image_url", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("characters", "og_image_url")
    op.drop_column("characters", "carousel_image_url")
    op.drop_column("character_stories", "carousel_image_url")
