"""add dungeon_slug and rewrite mythic plus names in Spanish

Revision ID: c4e7a9b1d630
Revises: b6c1d8e4a520
Create Date: 2026-10-17 22:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c4e7a9b1d630"
down_revision: Union[str, Sequence[str], None] = "b6c1d8e4a520"
branch_labels = None
depends_on = None

RENAMES = [
    ("Altar of Fangs", "Altar de los Colmillos", "altar-of-fangs"),
    ("Altar of the Fang", "Altar de los Colmillos", "altar-of-fangs"),
    ("Voidscar Arena", "Arena Lacravacua", "voidscar-arena"),
    ("Murder Row", "Frontal de la Muerte", "murder-row"),
    ("Den of Nalorakk", "Guarida de Nalorakk", "den-of-nalorakk"),
    ("The Blinding Vale", "El Valle Cegador", "the-blinding-vale"),
    ("Kings' Rest", "Reposo de los Reyes", "kings-rest"),
    ("King's Rest", "Reposo de los Reyes", "kings-rest"),
    ("Ruby Life Pools", "Estanques de Vida Rubí", "ruby-life-pools"),
    ("Temple of Sethraliss", "Templo de Sethraliss", "temple-of-sethraliss"),
    ("Windrunner Spire", "Aguja Brisaveloz", "windrunner-spire"),
    ("Magisters' Terrace", "Bancal del Magister", "magisters-terrace"),
    ("Maisara Caverns", "Cavernas de Maisara", "maisara-caverns"),
    ("Nexus-Point Xenas", "Punto de Nexo: Xenas", "nexuspoint-xenas"),
    ("Algeth'ar Academy", "Academia Algeth'ar", "algethar-academy"),
    ("Pit of Saron", "Foso de Saron", "pit-of-saron"),
    ("Skyreach", "Trecho Celestial", "skyreach"),
    ("Seat of the Triumvirate", "Trono del Triunvirato", "seat-of-the-triumvirate"),
]


def upgrade() -> None:
    op.add_column("processed_runs", sa.Column("dungeon_slug", sa.String(length=64), nullable=True))
    conn = op.get_bind()
    for english, spanish, slug in RENAMES:
        conn.execute(
            sa.text(
                "UPDATE processed_runs SET dungeon_slug = :slug, dungeon = :es "
                "WHERE dungeon_slug IS NULL AND dungeon ILIKE :en"
            ),
            {"slug": slug, "es": spanish, "en": english},
        )
        conn.execute(
            sa.text("UPDATE point_transactions SET reason = REPLACE(reason, :en, :es) WHERE reason LIKE :pat"),
            {"en": english, "es": spanish, "pat": f"%{english}%"},
        )


def downgrade() -> None:
    op.drop_column("processed_runs", "dungeon_slug")
