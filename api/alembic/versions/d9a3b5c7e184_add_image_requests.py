"""add image_requests table

Revision ID: d9a3b5c7e184
Revises: c8f2d4a1e063
Create Date: 2026-10-11 01:40:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d9a3b5c7e184"
down_revision: Union[str, Sequence[str], None] = "c8f2d4a1e063"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "image_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("characters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("form_answers", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("prompt_data", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("reference_image_url", sa.String(500), nullable=False),
        sa.Column("player_notes", sa.Text(), nullable=True),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_image_requests_status", "image_requests", ["status"])
    op.create_index("ix_image_requests_character_kind", "image_requests", ["character_id", "kind"])


def downgrade() -> None:
    op.drop_index("ix_image_requests_character_kind", table_name="image_requests")
    op.drop_index("ix_image_requests_status", table_name="image_requests")
    op.drop_table("image_requests")
