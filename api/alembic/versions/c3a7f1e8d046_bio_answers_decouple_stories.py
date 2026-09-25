"""questionnaire answers and bio written by staff

Revision ID: c3a7f1e8d046
Revises: b2d8f4a6c017
Create Date: 2026-09-25 21:40:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c3a7f1e8d046"
down_revision: Union[str, Sequence[str], None] = "b2d8f4a6c017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "characters",
        sa.Column("bio_answers", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "characters",
        sa.Column("bio_answers_pending", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column("characters", sa.Column("bio_rejection_reason", sa.Text(), nullable=True))
    op.add_column(
        "characters",
        sa.Column("bio_submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        """
        UPDATE characters c
        SET biography = COALESCE(NULLIF(c.biography, ''), s.biography),
            personality = COALESCE(NULLIF(c.personality, ''), s.personality),
            appearance = COALESCE(NULLIF(c.appearance, ''), s.appearance),
            bio_status = 'published'
        FROM character_stories s
        WHERE c.published_story_id = s.id
          AND s.status = 'approved'
        """
    )
    op.execute(
        """
        UPDATE characters
        SET bio_status = 'draft',
            bio_answers_pending = false
        WHERE bio_status = 'pending'
          AND (biography IS NULL OR biography = '')
        """
    )


def downgrade() -> None:
    op.drop_column("characters", "bio_submitted_at")
    op.drop_column("characters", "bio_rejection_reason")
    op.drop_column("characters", "bio_answers_pending")
    op.drop_column("characters", "bio_answers")
