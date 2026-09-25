"""admin-managed home carousel slides

Revision ID: a9c3e7f1b046
Revises: f8a1c2d4e905
Create Date: 2026-09-25 20:10:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a9c3e7f1b046"
down_revision: Union[str, Sequence[str], None] = "f8a1c2d4e905"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hero_slides",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("story_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kicker", sa.String(80), nullable=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("subtitle", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(1000), nullable=True),
        sa.Column("href", sa.String(500), nullable=True),
        sa.Column("cta_label", sa.String(80), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["story_id"], ["character_stories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["character_id"], ["characters.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("hero_slides")
