"""achievement for players who fund the guild bank

Revision ID: c8e2a4b1d705
Revises: b2d8e4a1c906
Create Date: 2026-11-07 03:30:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "c8e2a4b1d705"
down_revision: Union[str, Sequence[str], None] = "b2d8e4a1c906"
branch_labels = None
depends_on = None

ACHIEVEMENT_ID = "c4a8e1b7-d902-4f6a-9c3e-5b1d7a2f8046"


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO achievements (
            id, name, achievement_title, achievement_description, achievement_icon,
            account_wide, character_specific, repeatable, points_value
        ) VALUES (
            '{ACHIEVEMENT_ID}',
            'Invirtiendo en la Guardia',
            'Invirtiendo en la Guardia',
            'Colaboraste con al menos 5 de oro en la primera pestaña del banco de la Guardia.',
            '/missions/quest.png',
            true,
            false,
            false,
            0
        )
        """
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM user_achievements WHERE achievement_id = '{ACHIEVEMENT_ID}'")
    op.execute(f"DELETE FROM achievements WHERE id = '{ACHIEVEMENT_ID}'")
