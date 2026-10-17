from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func as sqlfunc, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.character import Character
from app.models.point_transaction import PointTransaction
from app.models.processed_run import ProcessedRun
from app.models.user import User
from app.services import mplus_sync
from app.services import points as points_service
from app.services.blizzard import BlizzardError

router = APIRouter(prefix="/points", tags=["points"])


class AdminNoteBody(BaseModel):
    reason: str
    amount: int | None = None


def _guild_names(run: ProcessedRun | None) -> list[str]:
    raw = (run.guild_character_names or "").strip() if run else ""
    return [part.strip() for part in raw.split(",") if part.strip()]


def _display_reason(tx: PointTransaction, run: ProcessedRun | None) -> str:
    reason = tx.reason or ""
    names = ", ".join(_guild_names(run))
    if names and names not in reason:
        return f"{reason} — {names}"
    return reason


def serialize_admin_tx(
    tx: PointTransaction,
    user: User | None,
    character: Character | None,
    run: ProcessedRun | None,
) -> dict:
    return {
        "id": str(tx.id),
        "user_id": str(tx.user_id),
        "username": (user.display_name or user.username) if user else "—",
        "discord_username": user.username if user else None,
        "character_name": character.name if character else None,
        "character_realm": character.realm if character else None,
        "amount": tx.amount,
        "counted_amount": points_service.effective_amount(tx),
        "reason": _display_reason(tx, run),
        "admin_note": tx.admin_note,
        "event_category": tx.event_category.value if tx.event_category else None,
        "bucket": points_service.bucket(tx.event_category),
        "weekly_capped": tx.weekly_capped,
        "active": tx.active,
        "occurred_at": (tx.occurred_at or tx.created_at).isoformat(),
        "created_at": tx.created_at.isoformat(),
        "processed_run_id": str(tx.processed_run_id) if tx.processed_run_id else None,
        "guild_characters": _guild_names(run),
        "dungeon": run.dungeon if run else None,
        "mythic_level": run.mythic_level if run else None,
        "timed": run.timed if run else None,
        "completed_at": run.completed_at.isoformat() if run and run.completed_at else None,
    }


def _load_tx(db: Session, tx_id: UUID) -> tuple[PointTransaction, User | None, Character | None, ProcessedRun | None]:
    row = (
        db.query(PointTransaction, User, Character, ProcessedRun)
        .outerjoin(User, User.id == PointTransaction.user_id)
        .outerjoin(Character, Character.id == PointTransaction.character_id)
        .outerjoin(ProcessedRun, ProcessedRun.id == PointTransaction.processed_run_id)
        .filter(PointTransaction.id == tx_id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Asignación no encontrada")
    return row


@router.post("/sync-mythic-plus")
async def sync_mythic_plus(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Revisa en Raider.io las M+ recientes de los personajes verificados y puntúa las nuevas."""
    try:
        return await mplus_sync.sync_mythic_plus(db)
    except BlizzardError as exc:
        raise HTTPException(502, str(exc))


@router.get("/admin/history")
def admin_history(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = Query(default=150, le=300),
    q: str = Query(default=""),
):
    """Historial completo de asignaciones, incluidas las anuladas."""
    query = (
        db.query(PointTransaction, User, Character, ProcessedRun)
        .outerjoin(User, User.id == PointTransaction.user_id)
        .outerjoin(Character, Character.id == PointTransaction.character_id)
        .outerjoin(ProcessedRun, ProcessedRun.id == PointTransaction.processed_run_id)
    )
    term = q.strip()
    if term:
        like = f"%{term}%"
        query = query.filter(
            or_(
                User.username.ilike(like),
                User.display_name.ilike(like),
                PointTransaction.reason.ilike(like),
                PointTransaction.admin_note.ilike(like),
                ProcessedRun.dungeon.ilike(like),
                ProcessedRun.guild_character_names.ilike(like),
                Character.name.ilike(like),
            )
        )
    rows = (
        query.order_by(
            sqlfunc.coalesce(PointTransaction.occurred_at, PointTransaction.created_at).desc(),
            PointTransaction.created_at.desc(),
        )
        .limit(limit)
        .all()
    )
    return [serialize_admin_tx(tx, user, character, run) for tx, user, character, run in rows]


@router.patch("/admin/{tx_id}")
def admin_edit_transaction(
    tx_id: UUID,
    body: AdminNoteBody,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tx, user, character, run = _load_tx(db, tx_id)
    if body.amount is None:
        raise HTTPException(400, "Indica la nueva cantidad")
    try:
        points_service.update_transaction_amount(db, tx, body.amount, body.reason)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    db.commit()
    db.refresh(tx)
    return serialize_admin_tx(tx, user, character, run)


@router.post("/admin/{tx_id}/void")
def admin_void_transaction(
    tx_id: UUID,
    body: AdminNoteBody,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tx, user, character, run = _load_tx(db, tx_id)
    try:
        points_service.void_transaction(db, tx, body.reason)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    db.commit()
    db.refresh(tx)
    return serialize_admin_tx(tx, user, character, run)
