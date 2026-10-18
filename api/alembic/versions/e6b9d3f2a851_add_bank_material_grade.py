"""add crafting material grade (bronze/silver/gold) to bank

Revision ID: e6b9d3f2a851
Revises: d5a8c2e1f740
Create Date: 2026-10-18 02:50:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e6b9d3f2a851"
down_revision: Union[str, Sequence[str], None] = "d5a8c2e1f740"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bank_items",
        sa.Column("material_grade", sa.String(length=16), server_default="none", nullable=False),
    )
    op.add_column(
        "bank_requests",
        sa.Column("material_grade", sa.String(length=16), server_default="none", nullable=False),
    )
    op.drop_constraint("bank_items_blizzard_item_id_key", "bank_items", type_="unique")
    op.create_unique_constraint(
        "uq_bank_items_blizzard_grade",
        "bank_items",
        ["blizzard_item_id", "material_grade"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_bank_items_blizzard_grade", "bank_items", type_="unique")
    op.create_unique_constraint("bank_items_blizzard_item_id_key", "bank_items", ["blizzard_item_id"])
    op.drop_column("bank_requests", "material_grade")
    op.drop_column("bank_items", "material_grade")
