"""forever gold deposits for the guild bank tab

Revision ID: a7c3e9b1d640
Revises: f6a2c8e1d904
Create Date: 2026-11-07 01:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a7c3e9b1d640"
down_revision: Union[str, Sequence[str], None] = "f6a2c8e1d904"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bank_gold_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("silver_per_point", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("goal_copper", sa.BigInteger(), nullable=False, server_default="1000000"),
    )
    op.execute(
        "INSERT INTO bank_gold_settings (id, silver_per_point, goal_copper) VALUES (1, 10, 1000000)"
    )
    op.create_table(
        "bank_gold_deposits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("character_name", sa.String(length=64), nullable=False),
        sa.Column("character_realm", sa.String(length=64), nullable=False),
        sa.Column("copper", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("estimated_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("awarded_points", sa.Integer(), nullable=True),
        sa.Column(
            "point_transaction_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("point_transactions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_bank_gold_deposits_status_created",
        "bank_gold_deposits",
        ["status", "created_at"],
    )
    op.create_index(
        "ix_bank_gold_deposits_user_created",
        "bank_gold_deposits",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_bank_gold_deposits_user_created", table_name="bank_gold_deposits")
    op.drop_index("ix_bank_gold_deposits_status_created", table_name="bank_gold_deposits")
    op.drop_table("bank_gold_deposits")
    op.drop_table("bank_gold_settings")
