"""Oro de Warcraft Forever para la pestaña del banco. Los puntos esperan la confirmación del líder."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user, require_guild_admin
from app.models.bank import BankGoldDeposit, BankGoldSettings
from app.models.character import Character
from app.models.enums import EventCategory
from app.models.user import User
from app.services.notifications import notify
from app.services import points as points_service

router = APIRouter(prefix="/bank/gold", tags=["bank"])

SILVER = 100
GOLD = 10_000
MAX_COPPER = 100_000 * GOLD
DEFAULT_SILVER_PER_POINT = 10
DEFAULT_GOAL_COPPER = 100 * GOLD


def to_copper(gold: int, silver: int, copper: int) -> int:
    return gold * GOLD + silver * SILVER + copper


def points_for(copper: int, silver_per_point: int) -> int:
    if silver_per_point < 1 or copper < 1:
        return 0
    return copper // (silver_per_point * SILVER)


def format_money(copper: int) -> str:
    gold, rest = divmod(max(0, copper), GOLD)
    silver, coins = divmod(rest, SILVER)
    parts: list[str] = []
    if gold:
        parts.append(f"{gold} de oro")
    if silver:
        parts.append(f"{silver} de plata")
    if coins or not parts:
        parts.append(f"{coins} de cobre")
    return ", ".join(parts)


def get_settings(db: Session) -> BankGoldSettings:
    row = db.query(BankGoldSettings).filter(BankGoldSettings.id == 1).first()
    if row is None:
        row = BankGoldSettings(
            id=1,
            silver_per_point=DEFAULT_SILVER_PER_POINT,
            goal_copper=DEFAULT_GOAL_COPPER,
        )
        db.add(row)
        db.flush()
    return row


def _sum_copper(db: Session, status: str) -> int:
    total = (
        db.query(func.coalesce(func.sum(BankGoldDeposit.copper), 0))
        .filter(BankGoldDeposit.status == status)
        .scalar()
    )
    return int(total or 0)


def _out(row: BankGoldDeposit, settings: BankGoldSettings) -> dict:
    live = points_for(int(row.copper), settings.silver_per_point)
    return {
        "id": str(row.id),
        "character_name": row.character_name,
        "character_realm": row.character_realm,
        "copper": int(row.copper),
        "status": row.status,
        "estimated_points": row.estimated_points,
        "current_points": live if row.status == "pending" else row.awarded_points,
        "awarded_points": row.awarded_points,
        "note": row.note,
        "admin_note": row.admin_note,
        "username": row.user.username if row.user else "",
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
    }


def _board(db: Session, deposits: list[BankGoldDeposit]) -> dict:
    settings = get_settings(db)
    return {
        "silver_per_point": settings.silver_per_point,
        "goal_copper": int(settings.goal_copper),
        "confirmed_copper": _sum_copper(db, "approved"),
        "pending_copper": _sum_copper(db, "pending"),
        "deposits": [_out(row, settings) for row in deposits],
    }


def _forever_character(db: Session, user: User, name: str, realm: str) -> Character:
    char = (
        db.query(Character)
        .filter(
            Character.user_id == user.id,
            Character.name == name.strip(),
            Character.realm == realm.strip(),
            Character.game == "forever",
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if char is None:
        raise HTTPException(400, "Solo un personaje de Warcraft Forever puede enviar este oro")
    return char


class GoldSend(BaseModel):
    character_name: str = Field(min_length=1, max_length=64)
    character_realm: str = Field(min_length=1, max_length=64)
    gold: int = Field(default=0, ge=0, le=100_000)
    silver: int = Field(default=0, ge=0, le=100_000)
    copper: int = Field(default=0, ge=0, le=100_000)
    note: str | None = Field(default=None, max_length=500)


class GoldSettingsBody(BaseModel):
    silver_per_point: int = Field(ge=1, le=100_000)
    goal_gold: int = Field(ge=1, le=1_000_000)


class GoldNote(BaseModel):
    note: str | None = Field(default=None, max_length=500)


@router.get("")
def gold_board(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(BankGoldDeposit)
        .options(joinedload(BankGoldDeposit.user))
        .filter(BankGoldDeposit.user_id == current_user.id)
        .order_by(BankGoldDeposit.created_at.desc())
        .limit(40)
        .all()
    )
    return _board(db, rows)


@router.post("", status_code=201)
def send_gold(
    body: GoldSend,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = _forever_character(db, current_user, body.character_name, body.character_realm)
    copper = to_copper(body.gold, body.silver, body.copper)
    if copper < 1:
        raise HTTPException(400, "Indica cuánto oro, plata o cobre envías")
    if copper > MAX_COPPER:
        raise HTTPException(400, "Esa cantidad pasa del límite")
    settings = get_settings(db)
    row = BankGoldDeposit(
        user_id=current_user.id,
        character_name=char.name,
        character_realm=char.realm,
        copper=copper,
        status="pending",
        estimated_points=points_for(copper, settings.silver_per_point),
        note=(body.note or "").strip() or None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _out(row, settings)


@router.post("/{deposit_id}/cancel")
def cancel_gold(
    deposit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(BankGoldDeposit).filter(BankGoldDeposit.id == deposit_id).first()
    if row is None or row.user_id != current_user.id:
        raise HTTPException(404, "Envío no encontrado")
    if row.status != "pending":
        raise HTTPException(400, "Solo se puede cancelar un envío pendiente")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.get("/admin")
def admin_gold(_: User = Depends(require_guild_admin), db: Session = Depends(get_db)):
    rows = (
        db.query(BankGoldDeposit)
        .options(joinedload(BankGoldDeposit.user))
        .filter(BankGoldDeposit.status == "pending")
        .order_by(BankGoldDeposit.created_at.asc())
        .all()
    )
    return _board(db, rows)


@router.patch("/admin/settings")
def update_gold_settings(
    body: GoldSettingsBody,
    _: User = Depends(require_guild_admin),
    db: Session = Depends(get_db),
):
    settings = get_settings(db)
    settings.silver_per_point = body.silver_per_point
    settings.goal_copper = body.goal_gold * GOLD
    db.commit()
    return admin_gold(_, db)


@router.post("/admin/{deposit_id}/approve")
def approve_gold(
    deposit_id: UUID,
    body: GoldNote,
    admin: User = Depends(require_guild_admin),
    db: Session = Depends(get_db),
):
    row = db.query(BankGoldDeposit).filter(BankGoldDeposit.id == deposit_id).first()
    if row is None:
        raise HTTPException(404, "Envío no encontrado")
    if row.status != "pending":
        raise HTTPException(400, "Este envío ya se resolvió")
    settings = get_settings(db)
    amount = points_for(int(row.copper), settings.silver_per_point)
    now = datetime.now(timezone.utc)
    money = format_money(int(row.copper))
    tx = None
    if amount > 0:
        tx = points_service.record_uncapped_event(
            db,
            user_id=row.user_id,
            amount=amount,
            reason=f"Oro de Forever: {money} ({row.character_name})",
            category=EventCategory.GUILD_BANK,
            occurred_at=now,
        )
    note = (body.note or "").strip() or None
    row.status = "approved"
    row.awarded_points = amount
    row.admin_note = note
    row.resolved_by = admin.id
    row.resolved_at = now
    row.point_transaction_id = tx.id if tx else None
    title = f"+{amount} puntos por oro de Forever" if amount else "Oro de Forever recibido"
    detail = f"El líder ha confirmado {money}."
    if amount == 0:
        detail += " Con la tarifa actual no llega a 1 punto."
    notify(db, user_id=row.user_id, kind="points_bank", title=title, body=detail, href="/banco")
    db.commit()
    db.refresh(row)
    return _out(row, settings)


@router.post("/admin/{deposit_id}/reject")
def reject_gold(
    deposit_id: UUID,
    body: GoldNote,
    admin: User = Depends(require_guild_admin),
    db: Session = Depends(get_db),
):
    row = db.query(BankGoldDeposit).filter(BankGoldDeposit.id == deposit_id).first()
    if row is None:
        raise HTTPException(404, "Envío no encontrado")
    if row.status != "pending":
        raise HTTPException(400, "Este envío ya se resolvió")
    row.status = "rejected"
    row.awarded_points = 0
    row.admin_note = (body.note or "").strip() or None
    row.resolved_by = admin.id
    row.resolved_at = datetime.now(timezone.utc)
    notify(
        db,
        user_id=row.user_id,
        kind="points_bank",
        title="Oro de Forever no confirmado",
        body=row.admin_note or "El líder no ha confirmado la llegada de ese oro.",
        href="/banco",
    )
    db.commit()
    settings = get_settings(db)
    db.refresh(row)
    return _out(row, settings)
