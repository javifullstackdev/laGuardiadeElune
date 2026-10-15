"""add slug to posts and character_stories

Revision ID: b7d2a9c4e611
Revises: e1b4c6d8f295
Create Date: 2026-10-15 20:30:00.000000
"""
import re
import unicodedata
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "b7d2a9c4e611"
down_revision: Union[str, Sequence[str], None] = "e1b4c6d8f295"
branch_labels = None
depends_on = None

TABLES = (
    ("posts", "published_at", "post"),
    ("character_stories", "submitted_at", "historia"),
)


def _slugify(text: str | None, fallback: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    if len(slug) > 80:
        slug = slug[:80].rsplit("-", 1)[0] or slug[:80]
    return slug or fallback


def upgrade() -> None:
    bind = op.get_bind()
    for table, order_column, fallback in TABLES:
        op.add_column(table, sa.Column("slug", sa.String(255), nullable=True))
        rows = bind.execute(sa.text(f"SELECT id, title FROM {table} ORDER BY {order_column} ASC")).fetchall()
        used: set[str] = set()
        for row_id, title in rows:
            base = _slugify(title, fallback)
            slug, n = base, 2
            while slug in used:
                slug = f"{base}-{n}"
                n += 1
            used.add(slug)
            bind.execute(sa.text(f"UPDATE {table} SET slug = :slug WHERE id = :id"), {"slug": slug, "id": row_id})
        op.create_index(f"ix_{table}_slug", table, ["slug"], unique=True)


def downgrade() -> None:
    for table, _, _ in reversed(TABLES):
        op.drop_index(f"ix_{table}_slug", table_name=table)
        op.drop_column(table, "slug")
