"""drop the hybrid itinerary for the current season

Revision ID: c7e2a4b9d816
Revises: b3e8c1a9d574
Create Date: 2026-10-29 20:10:00.000000

Players on hybrid must choose again. Until they do, this season's capped
events stop counting. The split itself happens when they pick a path.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c7e2a4b9d816"
down_revision: Union[str, Sequence[str], None] = "b3e8c1a9d574"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "hybrid_resplit_pending",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    from sqlalchemy.orm import Session

    from app.services.points import release_current_hybrid_itineraries

    session = Session(bind=op.get_bind())
    release_current_hybrid_itineraries(session)
    session.flush()


def downgrade() -> None:
    op.drop_column("users", "hybrid_resplit_pending")
