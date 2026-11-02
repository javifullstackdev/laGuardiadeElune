"""guild draws for private lottery pools

Revision ID: c1d4a8e6b902
Revises: e2b7c4a9d581
Create Date: 2026-11-02 17:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c1d4a8e6b902"
down_revision: Union[str, Sequence[str], None] = "e2b7c4a9d581"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "guild_draws",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organizer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("draw_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("signup_closes_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payment_due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("ticket_number", sa.String(32), nullable=True),
        sa.Column("ticket_series", sa.String(32), nullable=True),
        sa.Column("bizum_phone", sa.String(20), nullable=False),
        sa.Column("bizum_name", sa.String(120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_guild_draws_status_draw_at", "guild_draws", ["status", "draw_at"])
    op.create_table(
        "guild_draw_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "draw_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("guild_draws.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("share_cents", sa.Integer(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dropped_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("draw_id", "user_id", name="uq_guild_draw_entry"),
    )


def downgrade() -> None:
    op.drop_table("guild_draw_entries")
    op.drop_index("ix_guild_draws_status_draw_at", table_name="guild_draws")
    op.drop_table("guild_draws")
