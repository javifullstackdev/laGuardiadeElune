"""add DELVES and REPUTATION to eventcategory

Revision ID: f3b9d1e6a427
Revises: e7a4c2f9b318
Create Date: 2026-10-17 17:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "f3b9d1e6a427"
down_revision: Union[str, Sequence[str], None] = "e7a4c2f9b318"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE eventcategory ADD VALUE IF NOT EXISTS 'DELVES'")
    op.execute("ALTER TYPE eventcategory ADD VALUE IF NOT EXISTS 'REPUTATION'")


def downgrade() -> None:
    # PostgreSQL no permite quitar valores de un enum sin recrear el tipo
    pass
