"""link carousel slides to posts

Revision ID: d8e2a4c1b073
Revises: c3a7f1e8d046
Create Date: 2026-09-27 11:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d8e2a4c1b073"
down_revision: Union[str, Sequence[str], None] = "c3a7f1e8d046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hero_slides", sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_hero_slides_post_id",
        "hero_slides",
        "posts",
        ["post_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_hero_slides_post_id", "hero_slides", type_="foreignkey")
    op.drop_column("hero_slides", "post_id")
