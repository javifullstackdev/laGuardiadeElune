"""character wiki visibility and published biography

Revision ID: f8a1c2d4e905
Revises: e4b7a1c9d802
Create Date: 2026-09-25 20:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "f8a1c2d4e905"
down_revision: Union[str, Sequence[str], None] = "e4b7a1c9d802"
branch_labels = None
depends_on = None

DEFAULT_FIELDS = (
    '{"title": true, "age": true, "origin": true, "residence": true, '
    '"race": true, "class": true, "faction": true, '
    '"personality": true, "appearance": true}'
)


def upgrade() -> None:
    op.add_column(
        "characters",
        sa.Column("bio_status", sa.String(20), nullable=False, server_default="draft"),
    )
    op.add_column(
        "characters",
        sa.Column("published_story_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "characters",
        sa.Column(
            "public_fields",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(f"'{DEFAULT_FIELDS}'::jsonb"),
        ),
    )
    op.create_foreign_key(
        "fk_characters_published_story",
        "characters",
        "character_stories",
        ["published_story_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute(
        """
        UPDATE characters c
        SET published_story_id = s.id,
            bio_status = 'published'
        FROM (
            SELECT DISTINCT ON (character_id) id, character_id
            FROM character_stories
            WHERE status = 'approved'
            ORDER BY character_id, published_at DESC NULLS LAST, submitted_at DESC
        ) s
        WHERE c.id = s.character_id
        """
    )
    op.execute(
        """
        UPDATE characters c
        SET bio_status = 'pending'
        WHERE EXISTS (
            SELECT 1 FROM character_stories s
            WHERE s.character_id = c.id AND s.status = 'pending'
        )
        """
    )


def downgrade() -> None:
    op.drop_constraint("fk_characters_published_story", "characters", type_="foreignkey")
    op.drop_column("characters", "public_fields")
    op.drop_column("characters", "published_story_id")
    op.drop_column("characters", "bio_status")
