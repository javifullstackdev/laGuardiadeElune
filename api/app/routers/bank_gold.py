"""Oro de Warcraft Forever para la pestaña del banco. Los puntos esperan la confirmación del líder."""

from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user, require_guild_admin
from app.models.achievement import Achievement
from app.models.bank import BankGoldDeposit, BankGoldSettings
from app.models.character import Character
from app.models.enums import EventCategory
from app.models.user import User
from app.models.user_achievement import UserAchievement
from app.services.goal_card import (
    deadline_label,
    deadline_passed,
    format_money,
    goal_copy,
    mission_end,
    render_goal_card,
)
from app.services.discord_gold import goal_deposit_message, queue_goal_deposit
from app.services.notifications import notify
from app.services.missions import grant_ready
from app.services import points as points_service

router = APIRouter(prefix="/bank/gold", tags=["bank"])

SILVER = 100
GOLD = 10_000
MAX_COPPER = 100_000 * GOLD
DEFAULT_SILVER_PER_POINT = 10
DEFAULT_GOAL_COPPER = 100 * GOLD
DEFAULT_ENDS_ON = date(2026, 11, 30)


def to_copper(gold: int, silver: int, copper: int) -> int:
    return gold * GOLD + silver * SILVER + copper


def points_for(copper: int, silver_per_point: int) -> int:
    if silver_per_point < 1 or copper < 1:
        return 0
    return copper // (silver_per_point * SILVER)


def get_settings(db: Session) -> BankGoldSettings:
    row = db.query(BankGoldSettings).filter(BankGoldSettings.id == 1).first()
    if row is None:
        row = BankGoldSettings(
            id=1,
            silver_per_point=DEFAULT_SILVER_PER_POINT,
            goal_copper=DEFAULT_GOAL_COPPER,
            ends_on=DEFAULT_ENDS_ON,
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


def _sum_mission_copper(db: Session, ends_on: date | None) -> int:
    """Oro confirmado que cuenta para la recompensa: solo hasta el fin del día de cierre."""
    query = db.query(func.coalesce(func.sum(BankGoldDeposit.copper), 0)).filter(
        BankGoldDeposit.status == "approved"
    )
    if ends_on is not None:
        stamp = func.coalesce(BankGoldDeposit.resolved_at, BankGoldDeposit.created_at)
        query = query.filter(stamp < mission_end(ends_on))
    return int(query.scalar() or 0)


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


BANK_ACHIEVEMENT = "Invirtiendo en la Guardia"


def _contributors(db: Session, ends_on: date | None = None) -> list[dict]:
    query = (
        db.query(User.username, func.coalesce(func.sum(BankGoldDeposit.copper), 0))
        .join(User, User.id == BankGoldDeposit.user_id)
        .filter(BankGoldDeposit.status == "approved")
    )
    if ends_on is not None:
        stamp = func.coalesce(BankGoldDeposit.resolved_at, BankGoldDeposit.created_at)
        query = query.filter(stamp < mission_end(ends_on))
    rows = query.group_by(User.id, User.username).all()
    people = [
        {"username": name, "copper": int(total or 0)}
        for name, total in rows
        if int(total or 0) > 0
    ]
    people.sort(key=lambda row: (-row["copper"], row["username"].casefold()))
    return people


def grant_bank_investors(db: Session) -> None:
    """Si el objetivo se cumple antes del cierre, el logro es de quien aportó al menos 5 de oro. Sin puntos."""
    settings = get_settings(db)
    counted = _sum_mission_copper(db, settings.ends_on)
    if counted < int(settings.goal_copper):
        return
    achievement = db.query(Achievement).filter(Achievement.name == BANK_ACHIEVEMENT).first()
    if achievement is None:
        return
    description = "Colaboraste con al menos 5 de oro en la primera pestaña del banco de la Guardia."
    if achievement.achievement_description != description:
        achievement.achievement_description = description
    totals_query = db.query(
        BankGoldDeposit.user_id, func.coalesce(func.sum(BankGoldDeposit.copper), 0)
    ).filter(BankGoldDeposit.status == "approved")
    if settings.ends_on is not None:
        stamp = func.coalesce(BankGoldDeposit.resolved_at, BankGoldDeposit.created_at)
        totals_query = totals_query.filter(stamp < mission_end(settings.ends_on))
    totals = totals_query.group_by(BankGoldDeposit.user_id).all()
    already = {
        user_id
        for (user_id,) in db.query(UserAchievement.user_id)
        .filter(UserAchievement.achievement_id == achievement.id)
        .all()
    }
    for user_id, total in totals:
        if int(total or 0) < 5 * GOLD or user_id in already:
            continue
        db.add(UserAchievement(user_id=user_id, achievement_id=achievement.id, character_id=None))


def _mission(db: Session) -> dict:
    settings = get_settings(db)
    goal = int(settings.goal_copper)
    counted = _sum_mission_copper(db, settings.ends_on)
    met = goal > 0 and counted >= goal
    closed = deadline_passed(settings.ends_on) and not met
    label = deadline_label(settings.ends_on) if settings.ends_on else ""
    return {
        "goal": goal,
        "counted": counted,
        "met": met,
        "closed": closed,
        "ends_on": settings.ends_on.isoformat() if settings.ends_on else None,
        "label": label,
        "copy": goal_copy(counted, goal, closed=closed, deadline=label),
    }


def _board(db: Session, deposits: list[BankGoldDeposit]) -> dict:
    settings = get_settings(db)
    mission = _mission(db)
    return {
        "silver_per_point": settings.silver_per_point,
        "goal_copper": mission["goal"],
        "confirmed_copper": mission["counted"],
        "pending_copper": _sum_copper(db, "pending"),
        "ends_on": mission["ends_on"],
        "closed": mission["closed"],
        "met": mission["met"],
        "contributors": _contributors(db, settings.ends_on),
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
    ends_on: date


class GoldNote(BaseModel):
    note: str | None = Field(default=None, max_length=500)


@router.get("/announcement")
def gold_announcement(db: Session = Depends(get_db)):
    """Progreso público de la misión. Sin nombres: es lo que ven WhatsApp y Discord."""
    mission = _mission(db)
    copy = mission["copy"]
    return {
        "title": copy["title"],
        "headline": copy["headline"],
        "goal_copper": mission["goal"],
        "confirmed_copper": mission["counted"],
        "pending_copper": _sum_copper(db, "pending"),
        "ends_on": mission["ends_on"],
        "closed": mission["closed"],
        "met": mission["met"],
    }


@router.get("/card.jpg")
def gold_card(db: Session = Depends(get_db)):
    jpeg = render_goal_card(_mission(db)["copy"])
    return Response(
        content=jpeg,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=60",
            "Content-Length": str(len(jpeg)),
        },
    )


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
    grant_bank_investors(db)
    if db.new:
        db.commit()
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
    settings.ends_on = body.ends_on
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
    player = db.query(User).filter(User.id == row.user_id).first()
    if player is not None:
        grant_ready(db, player)
    grant_bank_investors(db)
    db.flush()
    counted = _sum_mission_copper(db, settings.ends_on)
    who = (player.display_name or player.username) if player else row.character_name
    queue_goal_deposit(
        db,
        goal_deposit_message(who or "Alguien", int(row.copper), counted, int(settings.goal_copper)),
    )
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
