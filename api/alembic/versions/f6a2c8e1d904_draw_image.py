"""image on a guild draw

Revision ID: f6a2c8e1d904
Revises: e5b2a8c4d173
Create Date: 2026-11-06 19:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f6a2c8e1d904"
down_revision: Union[str, Sequence[str], None] = "e5b2a8c4d173"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("guild_draws", sa.Column("image_url", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("guild_draws", "image_url")
