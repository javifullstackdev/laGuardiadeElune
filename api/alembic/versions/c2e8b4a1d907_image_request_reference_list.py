"""store every in-game screenshot on an image request

Revision ID: c2e8b4a1d907
Revises: b4c8e1a7d352
Create Date: 2026-10-23 19:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c2e8b4a1d907"
down_revision: Union[str, Sequence[str], None] = "b4c8e1a7d352"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "image_requests",
        sa.Column(
            "reference_image_urls",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
    )
    op.execute(
        """
        UPDATE image_requests
        SET reference_image_urls = jsonb_build_array(reference_image_url)
        WHERE reference_image_url IS NOT NULL
          AND reference_image_url <> ''
          AND reference_image_urls = '[]'::jsonb
        """
    )


def downgrade() -> None:
    op.drop_column("image_requests", "reference_image_urls")
