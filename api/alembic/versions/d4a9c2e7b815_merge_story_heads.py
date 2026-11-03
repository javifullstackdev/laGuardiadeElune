"""merge story slug and guild draw migrations

Revision ID: d4a9c2e7b815
Revises: b8e1c4a7d902, c1d4a8e6b902
Create Date: 2026-11-03 09:20:00.000000
"""
from typing import Sequence, Union

revision: str = "d4a9c2e7b815"
down_revision: Union[str, Sequence[str], None] = ("b8e1c4a7d902", "c1d4a8e6b902")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
