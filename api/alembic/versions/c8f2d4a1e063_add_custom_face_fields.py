"""add custom_face_url and pending_face_url

Revision ID: c8f2d4a1e063
Revises: b7e4c1a9d052
Create Date: 2026-10-11 01:20:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "c8f2d4a1e063"
down_revision: Union[str, Sequence[str], None] = "b7e4c1a9d052"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("characters", sa.Column("custom_face_url", sa.String(500), nullable=True))
    op.add_column("characters", sa.Column("pending_face_url", sa.String(500), nullable=True))
    # Las subidas recientes se etiquetaron como cara (ranking): moverlas ahí.
    op.execute(
        """
        UPDATE characters
        SET custom_face_url = custom_avatar_url,
            custom_avatar_url = NULL
        WHERE custom_avatar_url IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE characters
        SET pending_face_url = pending_avatar_url,
            pending_avatar_url = NULL
        WHERE pending_avatar_url IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE characters
        SET custom_avatar_url = COALESCE(custom_avatar_url, custom_face_url)
        WHERE custom_face_url IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE characters
        SET pending_avatar_url = COALESCE(pending_avatar_url, pending_face_url)
        WHERE pending_face_url IS NOT NULL
        """
    )
    op.drop_column("characters", "pending_face_url")
    op.drop_column("characters", "custom_face_url")
