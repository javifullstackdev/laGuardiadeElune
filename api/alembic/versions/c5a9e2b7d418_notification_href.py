"""notification link and user index

Revision ID: c5a9e2b7d418
Revises: a1b8c4d5e073
Create Date: 2026-10-18 12:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c5a9e2b7d418"
down_revision: Union[str, Sequence[str], None] = "a1b8c4d5e073"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("href", sa.String(length=500), nullable=True))
    op.create_index(
        "ix_notifications_user_created",
        "notifications",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_column("notifications", "href")
