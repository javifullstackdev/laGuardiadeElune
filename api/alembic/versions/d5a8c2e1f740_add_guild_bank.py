"""add guild bank catalog, requests and GUILD_BANK category

Revision ID: d5a8c2e1f740
Revises: c4e7a9b1d630
Create Date: 2026-10-18 02:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d5a8c2e1f740"
down_revision: Union[str, Sequence[str], None] = "c4e7a9b1d630"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE eventcategory ADD VALUE IF NOT EXISTS 'GUILD_BANK'")

    op.create_table(
        "bank_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("blizzard_item_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("quality", sa.String(length=32), nullable=True),
        sa.Column("icon_url", sa.String(length=500), nullable=True),
        sa.Column("points", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("blizzard_item_id"),
    )
    op.create_table(
        "bank_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("character_name", sa.String(length=24), nullable=True),
        sa.Column("character_realm", sa.String(length=64), nullable=True),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), server_default="pending", nullable=False),
        sa.Column("blizzard_item_id", sa.Integer(), nullable=False),
        sa.Column("item_name", sa.String(length=255), nullable=False),
        sa.Column("item_quality", sa.String(length=32), nullable=True),
        sa.Column("item_icon_url", sa.String(length=500), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("estimated_points", sa.Integer(), nullable=True),
        sa.Column("awarded_points", sa.Integer(), nullable=True),
        sa.Column("point_transaction_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["point_transaction_id"], ["point_transactions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bank_requests_status_kind", "bank_requests", ["status", "kind"])
    op.create_index("ix_bank_requests_user_created", "bank_requests", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_bank_requests_user_created", table_name="bank_requests")
    op.drop_index("ix_bank_requests_status_kind", table_name="bank_requests")
    op.drop_table("bank_requests")
    op.drop_table("bank_items")
