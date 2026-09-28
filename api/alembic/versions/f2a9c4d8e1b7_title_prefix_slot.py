"""title slots: prefix vs title, favorite prefix

Revision ID: f2a9c4d8e1b7
Revises: a4c8e2f7b019
Create Date: 2026-09-28 23:50:00.000000
"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "f2a9c4d8e1b7"
down_revision: Union[str, Sequence[str], None] = "a4c8e2f7b019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "titles",
        sa.Column("slot", sa.String(20), nullable=False, server_default="title"),
    )
    op.drop_constraint("uq_titles_name", "titles", type_="unique")
    op.create_unique_constraint("uq_titles_name_slot", "titles", ["name", "slot"])

    op.add_column(
        "characters",
        sa.Column("favorite_prefix_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_characters_favorite_prefix",
        "characters",
        "titles",
        ["favorite_prefix_id"],
        ["id"],
        ondelete="SET NULL",
    )

    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT id, prefix_title FROM characters "
            "WHERE prefix_title IS NOT NULL AND btrim(prefix_title) <> ''"
        )
    ).fetchall()
    for char_id, raw_name in rows:
        name = raw_name.strip()
        found = conn.execute(
            sa.text("SELECT id FROM titles WHERE name = :name AND slot = 'prefix'"),
            {"name": name},
        ).fetchone()
        if found:
            title_id = found[0]
        else:
            title_id = uuid.uuid4()
            conn.execute(
                sa.text(
                    "INSERT INTO titles (id, name, source, description, is_active, slot) "
                    "VALUES (:id, :name, 'custom', :description, true, 'prefix')"
                ),
                {
                    "id": title_id,
                    "name": name,
                    "description": "Antetítulo migrado desde el campo editable.",
                },
            )
        owned = conn.execute(
            sa.text(
                "SELECT 1 FROM character_titles "
                "WHERE character_id = :cid AND title_id = :tid"
            ),
            {"cid": char_id, "tid": title_id},
        ).fetchone()
        if not owned:
            conn.execute(
                sa.text(
                    "INSERT INTO character_titles (character_id, title_id) "
                    "VALUES (:cid, :tid)"
                ),
                {"cid": char_id, "tid": title_id},
            )
        conn.execute(
            sa.text(
                "UPDATE characters SET favorite_prefix_id = :tid WHERE id = :cid"
            ),
            {"tid": title_id, "cid": char_id},
        )


def downgrade() -> None:
    op.drop_constraint("fk_characters_favorite_prefix", "characters", type_="foreignkey")
    op.drop_column("characters", "favorite_prefix_id")
    op.drop_constraint("uq_titles_name_slot", "titles", type_="unique")
    op.create_unique_constraint("uq_titles_name", "titles", ["name"])
    op.drop_column("titles", "slot")
