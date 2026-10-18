"""craft orders and profession skill snapshots

Revision ID: d6b1e8a4c927
Revises: c5a9e2b7d418
Create Date: 2026-10-18 14:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d6b1e8a4c927"
down_revision: Union[str, Sequence[str], None] = "c5a9e2b7d418"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "character_profession_skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("characters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("blizzard_profession_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("skill_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_skill_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tier_name", sa.String(length=120), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("character_id", "blizzard_profession_id", name="uq_character_profession"),
    )
    op.create_table(
        "craft_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("requester_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("profession_id", sa.Integer(), nullable=False),
        sa.Column("profession_name", sa.String(length=120), nullable=False),
        sa.Column("item_name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="open"),
        sa.Column("crafter_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("crafter_character_name", sa.String(length=24), nullable=True),
        sa.Column("crafter_character_realm", sa.String(length=64), nullable=True),
        sa.Column("awarded_points", sa.Integer(), nullable=True),
        sa.Column("point_transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("point_transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_craft_orders_status_created", "craft_orders", ["status", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_craft_orders_status_created", table_name="craft_orders")
    op.drop_table("craft_orders")
    op.drop_table("character_profession_skills")
