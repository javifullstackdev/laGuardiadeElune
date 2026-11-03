"""remember previous story slugs

Revision ID: b8e1c4a7d902
Revises: e2b7c4a9d581
Create Date: 2026-11-03 09:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "b8e1c4a7d902"
down_revision: Union[str, Sequence[str], None] = "e2b7c4a9d581"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "character_stories",
        sa.Column(
            "slug_aliases",
            postgresql.ARRAY(sa.String(length=255)),
            nullable=False,
            server_default="{}",
        ),
    )


def downgrade() -> None:
    op.drop_column("character_stories", "slug_aliases")
