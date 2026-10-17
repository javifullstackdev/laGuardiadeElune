"""points engine: processed_runs and weekly points cap fields on point_transactions

Revision ID: e7a4c2f9b318
Revises: d2f6b8a3c915
Create Date: 2026-10-17 16:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e7a4c2f9b318"
down_revision: Union[str, Sequence[str], None] = "d2f6b8a3c915"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "processed_runs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("external_id", sa.String(length=64), nullable=False),
        sa.Column("dungeon", sa.String(length=255), nullable=False),
        sa.Column("mythic_level", sa.Integer(), nullable=False),
        sa.Column("timed", sa.Boolean(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("guild_member_count", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source", "external_id", name="uq_processed_runs_source_external"),
    )

    op.add_column("point_transactions", sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "point_transactions",
        sa.Column("weekly_capped", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column("point_transactions", sa.Column("counted_amount", sa.Integer(), nullable=True))
    op.add_column("point_transactions", sa.Column("processed_run_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_point_transactions_processed_run",
        "point_transactions",
        "processed_runs",
        ["processed_run_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint(
        "uq_point_transactions_user_run", "point_transactions", ["user_id", "processed_run_id"]
    )
    op.create_index(
        "ix_point_transactions_user_week", "point_transactions", ["user_id", "week_start"]
    )

    op.add_column("seasons", sa.Column("points_start_at", sa.DateTime(timezone=True), nullable=True))
    # Las temporadas ya importadas empiezan a puntuar ahora, no desde su inicio
    op.execute(
        "UPDATE seasons SET points_start_at = GREATEST(start_date, now()) WHERE points_start_at IS NULL"
    )


def downgrade() -> None:
    op.drop_column("seasons", "points_start_at")
    op.drop_index("ix_point_transactions_user_week", table_name="point_transactions")
    op.drop_constraint("uq_point_transactions_user_run", "point_transactions", type_="unique")
    op.drop_constraint("fk_point_transactions_processed_run", "point_transactions", type_="foreignkey")
    op.drop_column("point_transactions", "processed_run_id")
    op.drop_column("point_transactions", "counted_amount")
    op.drop_column("point_transactions", "weekly_capped")
    op.drop_column("point_transactions", "occurred_at")
    op.drop_table("processed_runs")
