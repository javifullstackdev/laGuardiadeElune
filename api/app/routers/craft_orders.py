from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.character import Character
from app.models.craft import CharacterProfessionSkill, CraftOrder, CraftReward
from app.models.enums import EventCategory
from app.models.relation_claim import Notification
from app.models.user import User
from app.services import blizzard, points as points_service
from app.services.blizzard import BlizzardError
from app.services.notifications import notify, notify_points
from app.services.professions import (
    CRAFTING_IDS,
    CRAFTING_NAMES,
    CRAFTING_PROFESSIONS,
    refresh_profession_snapshots,
)

router = APIRouter(prefix="/craft-orders", tags=["craft-orders"])

MAX_QTY = 20
DEFAULT_CRAFT_POINTS = 50


def require_craft_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "admin":
        raise HTTPException(403, "Solo el administrador puede anotar los puntos de un pedido")
    return current_user


def _reward_row(db: Session) -> CraftReward:
    row = db.query(CraftReward).filter(CraftReward.id == 1).first()
    if row is None:
        row = CraftReward(id=1, points_per_order=DEFAULT_CRAFT_POINTS)
        db.add(row)
        db.flush()
    return row


def _score_collected(db: Session, row: CraftOrder) -> None:
    """Da al artesano los puntos que el administrador dejó por defecto."""
    if row.awarded_points is not None or not row.crafter_user_id:
        return
    path = points_service.season_itinerary(db, row.crafter_user_id)
    eligible = points_service.scores_campaign(path)
    amount = _reward_row(db).points_per_order if eligible else 0
    now = datetime.now(timezone.utc)
    note = None
    if not eligible:
        note = (
            "Itinerario competitivo: fabricación sin puntos"
            if path and path.value == "competitive"
            else "Sin itinerario de artesanía y farmeo: fabricación sin puntos"
        )
    tx = None
    if eligible and amount > 0:
        tx = points_service.record_capped_event(
            db,
            user_id=row.crafter_user_id,
            amount=amount,
            reason=f"Artesanía: {row.quantity}× {row.item_name}",
            category=EventCategory.PROFESSION,
            occurred_at=now,
        )
        counted = (tx.counted_amount or 0) if tx else 0
        if tx is not None and counted > 0:
            notify_points(
                db,
                user_id=row.crafter_user_id,
                kind="points_craft",
                counted=counted,
                amount=amount,
                reason=f"Pedido entregado: {row.quantity}× {row.item_name}",
                href="/pedidos",
            )
    row.awarded_points = (tx.counted_amount or 0) if tx else 0
    row.point_transaction_id = tx.id if tx else None
    row.admin_note = note


def _visible_name(user: User | None) -> str:
    if user is None:
        return ""
    return user.display_name or user.username


def _high_skill(skill: int, maximum: int) -> bool:
    if maximum <= 0:
        return skill >= 75
    return skill / maximum >= 0.75 or skill >= 75


def _order_out(row: CraftOrder) -> dict:
    return {
        "id": str(row.id),
        "profession_id": row.profession_id,
        "profession_name": row.profession_name,
        "item_name": row.item_name,
        "blizzard_item_id": row.blizzard_item_id,
        "item_quality": row.item_quality,
        "item_icon_url": row.item_icon_url,
        "item_description": row.item_description,
        "item_detail": row.item_detail,
        "quantity": row.quantity,
        "note": row.note,
        "status": row.status,
        "requester_id": str(row.requester_id),
        "requester_name": _visible_name(row.requester),
        "crafter_user_id": str(row.crafter_user_id) if row.crafter_user_id else None,
        "crafter_name": _visible_name(row.crafter) if row.crafter_user_id else None,
        "crafter_character_name": row.crafter_character_name,
        "crafter_character_realm": row.crafter_character_realm,
        "awarded_points": row.awarded_points,
        "admin_note": row.admin_note,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "claimed_at": row.claimed_at.isoformat() if row.claimed_at else None,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
    }


class OrderIn(BaseModel):
    profession_id: int
    item_name: str = Field(min_length=2, max_length=255)
    blizzard_item_id: int | None = Field(default=None, ge=1)
    item_quality: str | None = Field(default=None, max_length=32)
    item_icon_url: str | None = Field(default=None, max_length=500)
    item_description: str | None = Field(default=None, max_length=600)
    item_detail: str | None = Field(default=None, max_length=160)
    quantity: int = Field(default=1, ge=1, le=MAX_QTY)
    note: str | None = None


def _https_icon(url: str | None) -> str | None:
    if not url:
        return None
    cleaned = url.strip()
    if cleaned.startswith("https://") and len(cleaned) <= 500:
        return cleaned
    return None


class ClaimIn(BaseModel):
    character_name: str = Field(min_length=2, max_length=24)
    character_realm: str = Field(min_length=2, max_length=64)


class CompleteIn(BaseModel):
    amount: int = Field(ge=0, le=5000)
    note: str | None = None


@router.get("/professions")
def list_professions(_: User = Depends(get_current_user)):
    return list(CRAFTING_PROFESSIONS)


@router.get("/items/search")
async def search_craft_items(
    profession_id: int,
    q: str = Query(..., min_length=2, max_length=80),
    _: User = Depends(get_current_user),
):
    if profession_id not in CRAFTING_IDS:
        raise HTTPException(400, "Esa profesión no fabrica objetos")
    try:
        return await blizzard.search_profession_crafts(profession_id, q)
    except BlizzardError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/crafters")
async def list_crafters(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        await refresh_profession_snapshots(db)
    except Exception:
        db.rollback()
    rows = (
        db.query(CharacterProfessionSkill, Character, User)
        .join(Character, Character.id == CharacterProfessionSkill.character_id)
        .join(User, User.id == Character.user_id)
        .filter(
            CharacterProfessionSkill.blizzard_profession_id.in_(CRAFTING_IDS),
            Character.deleted_at.is_(None),
            User.deleted_at.is_(None),
        )
        .all()
    )
    paths: dict = {}
    out = []
    for skill, char, user in rows:
        if user.id not in paths:
            paths[user.id] = points_service.season_itinerary(db, user.id)
        path = paths[user.id]
        out.append({
            "profession_id": skill.blizzard_profession_id,
            "profession_name": skill.name,
            "character_name": char.name,
            "character_realm": char.realm,
            "owner_id": str(user.id),
            "owner_name": _visible_name(user),
            "skill_points": skill.skill_points,
            "max_skill_points": skill.max_skill_points,
            "tier_name": skill.tier_name,
            "high_skill": _high_skill(skill.skill_points, skill.max_skill_points),
            "scores_points": points_service.scores_campaign(path),
            "path": path.value if path else None,
        })
    out.sort(key=lambda row: (-row["skill_points"], row["character_name"].lower()))
    return out


@router.get("/board")
def public_board(db: Session = Depends(get_db)):
    """Pedidos abiertos para el tablón. Sin notas ni nombres de jugador."""
    rows = (
        db.query(CraftOrder)
        .filter(CraftOrder.status == "open")
        .order_by(CraftOrder.created_at.desc())
        .limit(8)
        .all()
    )
    return [
        {
            "id": str(row.id),
            "profession_id": row.profession_id,
            "profession_name": row.profession_name,
            "item_name": row.item_name,
            "quantity": row.quantity,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.get("")
def list_orders(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(CraftOrder)
        .order_by(CraftOrder.created_at.desc())
        .limit(80)
        .all()
    )
    return [_order_out(row) for row in rows]


class RewardIn(BaseModel):
    points_per_order: int = Field(ge=0, le=5000)


@router.get("/admin")
def admin_queue(_: User = Depends(require_craft_admin), db: Session = Depends(get_db)):
    """Valor por defecto y pedidos recogidos."""
    rows = (
        db.query(CraftOrder)
        .filter(CraftOrder.status == "collected")
        .order_by(CraftOrder.resolved_at.desc(), CraftOrder.created_at.desc())
        .limit(40)
        .all()
    )
    orders = []
    for row in rows:
        item = _order_out(row)
        path = points_service.season_itinerary(db, row.crafter_user_id) if row.crafter_user_id else None
        item["scores_points"] = bool(points_service.scores_campaign(path))
        item["path"] = path.value if path else None
        orders.append(item)
    return {"points_per_order": _reward_row(db).points_per_order, "orders": orders}


@router.put("/admin")
def set_reward(
    body: RewardIn,
    _: User = Depends(require_craft_admin),
    db: Session = Depends(get_db),
):
    row = _reward_row(db)
    row.points_per_order = body.points_per_order
    db.commit()
    db.refresh(row)
    return {"points_per_order": row.points_per_order}


@router.post("", status_code=201)
async def create_order(
    body: OrderIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.profession_id not in CRAFTING_IDS:
        raise HTTPException(400, "Esa profesión no fabrica objetos")
    item = body.item_name.strip()
    if len(item) < 2:
        raise HTTPException(400, "Describe el objeto que necesitas")
    description = (body.item_description or "").strip() or None
    row = CraftOrder(
        requester_id=current_user.id,
        profession_id=body.profession_id,
        profession_name=CRAFTING_NAMES[body.profession_id],
        item_name=item,
        blizzard_item_id=body.blizzard_item_id,
        item_quality=(body.item_quality or "").strip().lower() or None,
        item_icon_url=_https_icon(body.item_icon_url),
        item_description=description[:600] if description else None,
        item_detail=((body.item_detail or "").strip()[:160] or None),
        quantity=body.quantity,
        note=(body.note or "").strip() or None,
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    try:
        await refresh_profession_snapshots(db)
    except Exception:
        db.rollback()
    _offer_to_crafters(db, row)
    db.commit()
    db.refresh(row)
    return _order_out(row)


def _offer_to_crafters(db: Session, order: CraftOrder) -> None:
    """Avisa del pedido. Quien lo publica ve la confirmación; el resto puede cogerlo."""
    known = {
        user_id
        for (user_id,) in (
            db.query(Character.user_id)
            .join(CharacterProfessionSkill, CharacterProfessionSkill.character_id == Character.id)
            .join(User, User.id == Character.user_id)
            .filter(
                CharacterProfessionSkill.blizzard_profession_id == order.profession_id,
                Character.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
            .distinct()
            .all()
        )
    }
    recipients = known - {order.requester_id}
    # Sin profesiones guardadas no hay a quién avisar. Se avisa al resto de la hermandad.
    if not known:
        recipients = {
            user_id
            for (user_id,) in (
                db.query(User.id)
                .filter(User.deleted_at.is_(None), User.id != order.requester_id)
                .all()
            )
        }
    title = f"Pedido de {order.profession_name}"
    body = f"{order.quantity}× {order.item_name}. ¿Lo fabricas?"
    for user_id in recipients:
        notify(
            db,
            user_id=user_id,
            kind="craft_offer",
            title=title,
            body=body,
            href="/pedidos",
            craft_order_id=order.id,
        )
    notify(
        db,
        user_id=order.requester_id,
        kind="craft_published",
        title="Tu pedido ya está en el tablón",
        body=f"{order.quantity}× {order.item_name} ({order.profession_name}).",
        href="/pedidos",
        craft_order_id=order.id,
    )


@router.post("/{order_id}/claim")
def claim_order(
    order_id: UUID,
    body: ClaimIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(CraftOrder).filter(CraftOrder.id == order_id).first()
    if not row:
        raise HTTPException(404, "Pedido no encontrado")
    if row.status != "open":
        raise HTTPException(400, "Este pedido ya no está libre")
    if row.requester_id == current_user.id:
        raise HTTPException(400, "No puedes fabricar tu propio pedido")

    name = body.character_name.strip()
    realm = body.character_realm.strip()
    char = (
        db.query(Character)
        .filter(
            Character.user_id == current_user.id,
            func.lower(Character.name) == name.lower(),
            func.lower(Character.realm) == realm.lower(),
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not char:
        raise HTTPException(404, "Ese personaje no es tuyo")
    skill = (
        db.query(CharacterProfessionSkill)
        .filter(
            CharacterProfessionSkill.character_id == char.id,
            CharacterProfessionSkill.blizzard_profession_id == row.profession_id,
        )
        .first()
    )
    if skill is None:
        raise HTTPException(
            409,
            "No tenemos esa profesión en el personaje. Ábrela en la pestaña Profesiones para actualizarla.",
        )

    row.status = "claimed"
    row.crafter_user_id = current_user.id
    row.crafter_character_name = char.name
    row.crafter_character_realm = char.realm
    row.claimed_at = datetime.now(timezone.utc)
    who = _visible_name(current_user)
    notify(
        db,
        user_id=row.requester_id,
        kind="craft_claimed",
        title="Han aceptado tu pedido",
        body=f"{who} ({char.name}-{char.realm}) va a fabricar {row.quantity}× {row.item_name}.",
        href="/pedidos",
        craft_order_id=row.id,
    )
    notify(
        db,
        user_id=current_user.id,
        kind="craft_accepted",
        title="Has aceptado el pedido",
        body=f"Cuando fabriques {row.quantity}× {row.item_name} en el juego, márcalo como completado.",
        href="/pedidos",
        craft_order_id=row.id,
    )
    db.commit()
    db.refresh(row)
    return _order_out(row)


def _load_order(db: Session, order_id: UUID) -> CraftOrder:
    row = db.query(CraftOrder).filter(CraftOrder.id == order_id).first()
    if not row:
        raise HTTPException(404, "Pedido no encontrado")
    return row


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _load_order(db, order_id)
    now = datetime.now(timezone.utc)
    if row.status == "open":
        staff = current_user.role.value in ("admin", "officer")
        if row.requester_id != current_user.id and not staff:
            raise HTTPException(403, "Solo quien lo pidió puede cancelarlo")
        if row.requester_id != current_user.id:
            notify(
                db,
                user_id=row.requester_id,
                kind="craft_cancelled",
                title="Tu pedido se ha cancelado",
                body=f"{row.quantity}× {row.item_name}.",
                href="/pedidos",
                craft_order_id=row.id,
            )
        told = {
            user_id
            for (user_id,) in db.query(Notification.user_id)
            .filter(
                Notification.craft_order_id == row.id,
                Notification.kind == "craft_offer",
                Notification.user_id != current_user.id,
            )
            .distinct()
        }
        for user_id in told:
            notify(
                db,
                user_id=user_id,
                kind="craft_cancelled",
                title="El pedido se ha cancelado",
                body=f"{row.quantity}× {row.item_name} ({row.profession_name}) ya no está en el tablón.",
                href="/pedidos",
                craft_order_id=row.id,
            )
    elif row.status == "claimed":
        if row.crafter_user_id != current_user.id:
            raise HTTPException(403, "Solo el artesano que lo ha aceptado puede cancelarlo")
        notify(
            db,
            user_id=row.requester_id,
            kind="craft_cancelled",
            title="El artesano ha cancelado tu pedido",
            body=(
                f"{_visible_name(current_user)} ya no fabrica "
                f"{row.quantity}× {row.item_name}."
            ),
            href="/pedidos",
            craft_order_id=row.id,
        )
    else:
        raise HTTPException(400, "Este pedido ya no se puede cancelar")
    row.status = "cancelled"
    row.resolved_by = current_user.id
    row.resolved_at = now
    db.commit()
    db.refresh(row)
    return _order_out(row)


@router.post("/{order_id}/finish")
def finish_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _load_order(db, order_id)
    if row.status != "claimed" or row.crafter_user_id != current_user.id:
        raise HTTPException(403, "Solo el artesano que lo ha aceptado puede marcarlo como fabricado")
    row.status = "completed"
    notify(
        db,
        user_id=row.requester_id,
        kind="craft_ready",
        title="Tu pedido ya está fabricado",
        body=(
            f"{_visible_name(current_user)} ha fabricado {row.quantity}× {row.item_name}. "
            "Cuando lo recojas en el juego, márcalo como recogido."
        ),
        href="/pedidos",
        craft_order_id=row.id,
    )
    db.commit()
    db.refresh(row)
    return _order_out(row)


@router.post("/{order_id}/collect")
def collect_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _load_order(db, order_id)
    if row.status != "completed" or row.requester_id != current_user.id:
        raise HTTPException(403, "Solo quien lo pidió puede marcarlo como recogido")
    row.status = "collected"
    row.resolved_by = current_user.id
    row.resolved_at = datetime.now(timezone.utc)
    _score_collected(db, row)
    if row.crafter_user_id:
        notify(
            db,
            user_id=row.crafter_user_id,
            kind="craft_collected",
            title="Han recogido tu pedido",
            body=f"{_visible_name(current_user)} ha recogido {row.quantity}× {row.item_name}.",
            href="/pedidos",
            craft_order_id=row.id,
        )
    db.commit()
    db.refresh(row)
    return _order_out(row)


@router.post("/{order_id}/complete")
def complete_order(
    order_id: UUID,
    body: CompleteIn,
    _: User = Depends(require_craft_admin),
    db: Session = Depends(get_db),
):
    row = _load_order(db, order_id)
    if row.status != "collected" or not row.crafter_user_id:
        raise HTTPException(400, "El pedido tiene que estar recogido antes de anotar puntos")
    if row.awarded_points is not None:
        raise HTTPException(400, "Este pedido ya tiene puntos")
    _score_collected(db, row)
    if body.note and body.note.strip():
        extra = body.note.strip()
        row.admin_note = f"{row.admin_note} · {extra}" if row.admin_note else extra
    db.commit()
    db.refresh(row)
    return _order_out(row)
