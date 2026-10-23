"""let an admin hide a character surname

Revision ID: e7c3a9b1d048
Revises: c2e8b4a1d907
Create Date: 2026-10-23 22:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e7c3a9b1d048"
down_revision: Union[str, Sequence[str], None] = "c2e8b4a1d907"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "characters",
        sa.Column("surname_allowed", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("characters", "surname_allowed")
