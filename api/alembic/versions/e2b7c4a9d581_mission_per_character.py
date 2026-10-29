"""sheet mission once per character

Revision ID: e2b7c4a9d581
Revises: d8f3b1c6e247
Create Date: 2026-10-29 21:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "e2b7c4a9d581"
down_revision: Union[str, Sequence[str], None] = "d8f3b1c6e247"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_missions",
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_user_missions_character_id",
        "user_missions",
        "characters",
        ["character_id"],
        ["id"],
        ondelete="SET NULL",
    )
    # La fila antigua se cobró una sola vez. Se ata a una ficha ya publicada
    # para no volver a pagarla al pasar a una misión por personaje.
    op.execute(
        """
        UPDATE user_missions AS um
        SET character_id = picked.id
        FROM (
            SELECT DISTINCT ON (c.user_id) c.user_id, c.id
            FROM characters AS c
            WHERE c.deleted_at IS NULL
              AND c.bio_status = 'published'
            ORDER BY c.user_id, c.is_main DESC, c.name
        ) AS picked
        WHERE um.user_id = picked.user_id
          AND um.mission_key = 'publish_character_sheet'
          AND um.character_id IS NULL
        """
    )
    op.drop_constraint("uq_user_missions", "user_missions", type_="unique")
    op.create_index(
        "uq_user_missions_character",
        "user_missions",
        ["user_id", "mission_key", "character_id"],
        unique=True,
        postgresql_where=sa.text("character_id IS NOT NULL"),
    )
    op.create_index(
        "uq_user_missions_player",
        "user_missions",
        ["user_id", "mission_key"],
        unique=True,
        postgresql_where=sa.text("character_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_user_missions_player", table_name="user_missions")
    op.drop_index("uq_user_missions_character", table_name="user_missions")
    op.execute(
        """
        DELETE FROM user_missions AS older
        USING user_missions AS newer
        WHERE older.user_id = newer.user_id
          AND older.mission_key = newer.mission_key
          AND older.completed_at > newer.completed_at
        """
    )
    op.drop_constraint("fk_user_missions_character_id", "user_missions", type_="foreignkey")
    op.drop_column("user_missions", "character_id")
    op.create_unique_constraint("uq_user_missions", "user_missions", ["user_id", "mission_key"])
