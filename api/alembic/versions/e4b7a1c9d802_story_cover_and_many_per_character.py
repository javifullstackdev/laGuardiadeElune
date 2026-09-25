"""allow many stories per character and optional cover

Revision ID: e4b7a1c9d802
Revises: d1a8c3f6e290
Create Date: 2026-09-25 19:50:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "e4b7a1c9d802"
down_revision: Union[str, Sequence[str], None] = "d1a8c3f6e290"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_character_story_character", "character_stories", type_="unique")
    op.add_column("character_stories", sa.Column("cover_url", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("character_stories", "cover_url")
    op.create_unique_constraint("uq_character_story_character", "character_stories", ["character_id"])
