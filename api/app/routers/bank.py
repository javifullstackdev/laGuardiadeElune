from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_guild_admin
from app.models.bank import BankItem, BankRequest
from app.models.character import Character
from app.models.enums import EventCategory
from app.models.user import User, UserPath
from app.models.user_season_path import UserSeasonPath
from app.services import blizzard, points as points_service
from app.services import seasons as season_service
from app.services.blizzard import BlizzardError

router = APIRouter(prefix="/bank", tags=["bank"])

MAX_QTY = 5000
MATERIAL_GRADES = ("none", "bronze", "silver", "gold")
GRADE_ES = {"none": None, "bronze": "bronce", "silver": "plata", "gold": "oro"}
GRADE_ALIASES = {
    "none": "none",
    "bronze": "bronze",
    "bronce": "bronze",
    "silver": "silver",
    "plata": "silver",
    "gold": "gold",
    "oro": "gold",
}


def _grade(raw: str | None) -> str:
    return GRADE_ALIASES.get((raw or "none").strip().lower(), "none")


def _grade_label(raw: str | None) -> str | None:
    return GRADE_ES.get(_grade(raw))


class ItemPick(BaseModel):
    blizzard_item_id: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=255)
    quality: str | None = None
    material_grade: str = "bronze"
    icon_url: str | None = None
    quantity: int = Field(ge=1, le=MAX_QTY)
    note: str | None = Field(default=None, max_length=500)
    character_name: str | None = Field(default=None, max_length=24)
    character_realm: str | None = Field(default=None, max_length=64)


class CatalogWrite(BaseModel):
    blizzard_item_id: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=255)
    quality: str | None = None
    material_grade: str = "bronze"
    icon_url: str | None = None
    points: int = Field(ge=0, le=5000)


class CatalogPoints(BaseModel):
    points: int = Field(ge=0, le=5000)


class ResolveBody(BaseModel):
    amount: int | None = Field(default=None, ge=0, le=50000)
    note: str | None = Field(default=None, max_length=500)


def _username(user: User | None) -> str:
    if not user:
        return "—"
    return user.display_name or user.username


def _catalog_lookup(db: Session, item_id: int, grade: str | None) -> BankItem | None:
    return (
        db.query(BankItem)
        .filter(
            BankItem.blizzard_item_id == item_id,
            BankItem.material_grade == _grade(grade),
        )
        .first()
    )


def _catalog_map(db: Session, keys: list[tuple[int, str]]) -> dict[tuple[int, str], BankItem]:
    if not keys:
        return {}
    item_ids = {item_id for item_id, _ in keys}
    rows = db.query(BankItem).filter(BankItem.blizzard_item_id.in_(item_ids)).all()
    return {(row.blizzard_item_id, row.material_grade): row for row in rows}


def _demand(db: Session) -> dict[tuple[int, str], dict[str, int]]:
    rows = (
        db.query(BankRequest.blizzard_item_id, BankRequest.material_grade, BankRequest.kind, func.count())
        .filter(BankRequest.status == "pending")
        .group_by(BankRequest.blizzard_item_id, BankRequest.material_grade, BankRequest.kind)
        .all()
    )
    out: dict[tuple[int, str], dict[str, int]] = {}
    for item_id, grade, kind, count in rows:
        slot = out.setdefault((item_id, _grade(grade)), {"deposits": 0, "withdrawals": 0})
        if kind == "deposit":
            slot["deposits"] = count
        elif kind == "withdrawal":
            slot["withdrawals"] = count
    return out


def serialize_item(item: BankItem, demand: dict[tuple[int, str], dict[str, int]] | None = None) -> dict:
    stats = (demand or {}).get((item.blizzard_item_id, item.material_grade)) or {
        "deposits": 0,
        "withdrawals": 0,
    }
    return {
        "id": str(item.id),
        "blizzard_item_id": item.blizzard_item_id,
        "name": item.name,
        "quality": item.quality,
        "material_grade": item.material_grade,
        "icon_url": item.icon_url,
        "points": item.points,
        "pending_deposits": stats["deposits"],
        "pending_withdrawals": stats["withdrawals"],
    }


def _paths_for_users(db: Session, user_ids: list) -> dict:
    ids = list({uid for uid in user_ids if uid})
    if not ids:
        return {}
    season = season_service.current_season(db)
    if not season:
        return {uid: None for uid in ids}
    rows = (
        db.query(UserSeasonPath)
        .filter(UserSeasonPath.season_id == season.id, UserSeasonPath.user_id.in_(ids))
        .all()
    )
    choices = {row.user_id: row.path for row in rows}
    return {uid: choices.get(uid) for uid in ids}


def serialize_request(
    row: BankRequest,
    catalog: BankItem | None = None,
    path: UserPath | None = None,
) -> dict:
    live = (catalog.points * row.quantity) if catalog else None
    scores = points_service.scores_guild_bank(path) and row.kind == "deposit"
    return {
        "id": str(row.id),
        "kind": row.kind,
        "status": row.status,
        "blizzard_item_id": row.blizzard_item_id,
        "item_name": row.item_name,
        "item_quality": row.item_quality,
        "material_grade": row.material_grade,
        "item_icon_url": row.item_icon_url,
        "quantity": row.quantity,
        "note": row.note,
        "character_name": row.character_name,
        "character_realm": row.character_realm,
        "estimated_points": row.estimated_points,
        "current_points": live if scores else 0,
        "awarded_points": row.awarded_points,
        "admin_note": row.admin_note,
        "username": _username(row.user),
        "path": path.value if path else None,
        "scores_points": scores,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
    }


def _dump_requests(db: Session, rows: list[BankRequest]) -> list[dict]:
    catalog = _catalog_map(db, [(row.blizzard_item_id, _grade(row.material_grade)) for row in rows])
    paths = _paths_for_users(db, [row.user_id for row in rows])
    return [
        serialize_request(
            row,
            catalog.get((row.blizzard_item_id, _grade(row.material_grade))),
            paths.get(row.user_id),
        )
        for row in rows
    ]


def _own_character(db: Session, user: User, name: str | None, realm: str | None) -> tuple[str | None, str | None]:
    if not name or not realm:
        return None, None
    char = (
        db.query(Character)
        .filter(
            Character.user_id == user.id,
            Character.name == name.strip(),
            Character.realm == realm.strip(),
            Character.deleted_at.is_(None),
        )
        .first()
    )
    if not char:
        raise HTTPException(400, "Ese personaje no está en tu cuenta")
    return char.name, char.realm


def _create_request(db: Session, user: User, body: ItemPick, kind: str) -> BankRequest:
    grade = _grade(body.material_grade)
    catalog = _catalog_lookup(db, body.blizzard_item_id, grade)
    char_name, char_realm = _own_character(db, user, body.character_name, body.character_realm)
    eligible = points_service.scores_guild_bank(points_service.season_itinerary(db, user.id))
    estimated = (catalog.points * body.quantity) if catalog and eligible else 0
    row = BankRequest(
        user_id=user.id,
        character_name=char_name,
        character_realm=char_realm,
        kind=kind,
        status="pending",
        blizzard_item_id=body.blizzard_item_id,
        item_name=body.name.strip(),
        item_quality=body.quality,
        material_grade=grade,
        item_icon_url=body.icon_url,
        quantity=body.quantity,
        note=(body.note or "").strip() or None,
        estimated_points=estimated if kind == "deposit" else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/items")
def list_catalog(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    demand = _demand(db)
    rows = db.query(BankItem).order_by(BankItem.name, BankItem.material_grade).all()
    return [serialize_item(row, demand) for row in rows]


@router.get("/items/search")
async def search_catalog_items(
    q: str = Query(..., min_length=2, max_length=80),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        hits = await blizzard.search_items(q)
    except BlizzardError as exc:
        raise HTTPException(502, str(exc)) from exc
    ids = [hit["id"] for hit in hits]
    known = {
        row.blizzard_item_id
        for row in (
            db.query(BankItem).filter(BankItem.blizzard_item_id.in_(ids)).all() if ids else []
        )
    }
    return [{**hit, "in_catalog": hit["id"] in known} for hit in hits]


@router.get("/me")
def bank_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    path = points_service.season_itinerary(db, current_user.id)
    return {
        "path": path.value if path else None,
        "scores_points": points_service.scores_guild_bank(path),
    }


@router.get("/characters")
def my_characters(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Character)
        .filter(Character.user_id == current_user.id, Character.deleted_at.is_(None))
        .order_by(Character.is_main.desc(), Character.name)
        .all()
    )
    return [{"name": c.name, "realm": c.realm, "is_main": c.is_main} for c in rows]


@router.get("/requests/mine")
def my_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(BankRequest)
        .filter(BankRequest.user_id == current_user.id)
        .order_by(BankRequest.created_at.desc())
        .limit(80)
        .all()
    )
    return _dump_requests(db, rows)


@router.post("/deposits", status_code=201)
def create_deposit(
    body: ItemPick,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _create_request(db, current_user, body, "deposit")
    return _dump_requests(db, [row])[0]


@router.post("/withdrawals", status_code=201)
def create_withdrawal(
    body: ItemPick,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _create_request(db, current_user, body, "withdrawal")
    return _dump_requests(db, [row])[0]


@router.post("/requests/{request_id}/cancel")
def cancel_mine(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(BankRequest).filter(BankRequest.id == request_id).first()
    if not row or row.user_id != current_user.id:
        raise HTTPException(404, "Solicitud no encontrada")
    if row.status != "pending":
        raise HTTPException(400, "Solo se pueden cancelar solicitudes pendientes")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.get("/admin/queue")
def admin_queue(_: User = Depends(require_guild_admin), db: Session = Depends(get_db)):
    rows = (
        db.query(BankRequest)
        .filter(BankRequest.status == "pending")
        .order_by(BankRequest.created_at.asc())
        .all()
    )
    return _dump_requests(db, rows)


@router.get("/admin/items")
def admin_items(_: User = Depends(require_guild_admin), db: Session = Depends(get_db)):
    demand = _demand(db)
    rows = db.query(BankItem).order_by(BankItem.name, BankItem.material_grade).all()
    return [serialize_item(row, demand) for row in rows]


@router.post("/admin/items", status_code=201)
def upsert_item(
    body: CatalogWrite,
    _: User = Depends(require_guild_admin),
    db: Session = Depends(get_db),
):
    grade = _grade(body.material_grade)
    item = _catalog_lookup(db, body.blizzard_item_id, grade)
    if item is None:
        item = BankItem(blizzard_item_id=body.blizzard_item_id, material_grade=grade)
        db.add(item)
    item.name = body.name.strip()
    item.quality = body.quality
    item.material_grade = grade
    item.icon_url = body.icon_url
    item.points = body.points
    db.commit()
    db.refresh(item)
    return serialize_item(item, _demand(db))


@router.patch("/admin/items/{item_id}")
def update_item_points(
    item_id: UUID,
    body: CatalogPoints,
    _: User = Depends(require_guild_admin),
    db: Session = Depends(get_db),
):
    item = db.query(BankItem).filter(BankItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Objeto no encontrado")
    item.points = body.points
    db.commit()
    db.refresh(item)
    return serialize_item(item, _demand(db))


@router.post("/admin/requests/{request_id}/approve")
def approve_deposit(
    request_id: UUID,
    body: ResolveBody,
    admin: User = Depends(require_guild_admin),
    db: Session = Depends(get_db),
):
    row = db.query(BankRequest).filter(BankRequest.id == request_id).first()
    if not row:
        raise HTTPException(404, "Solicitud no encontrada")
    if row.kind != "deposit":
        raise HTTPException(400, "Las retiradas se marcan como entregadas, no se aprueban con puntos")
    if row.status != "pending":
        raise HTTPException(400, "Esta solicitud ya se resolvió")

    catalog = _catalog_lookup(db, row.blizzard_item_id, row.material_grade)
    path = points_service.season_itinerary(db, row.user_id)
    eligible = points_service.scores_guild_bank(path)
    suggested = (catalog.points * row.quantity) if catalog else 0
    amount = suggested if body.amount is None else body.amount
    now = datetime.now(timezone.utc)

    tx = None
    awarded = 0
    if eligible and amount > 0:
        tx = points_service.record_capped_event(
            db,
            user_id=row.user_id,
            amount=amount,
            reason=f"Banco: {row.quantity}× {row.item_name}"
            + (f" ({_grade_label(row.material_grade)})" if _grade_label(row.material_grade) else ""),
            category=EventCategory.GUILD_BANK,
            occurred_at=now,
        )
        awarded = amount

    if catalog is None:
        catalog = BankItem(
            blizzard_item_id=row.blizzard_item_id,
            name=row.item_name,
            quality=row.item_quality,
            material_grade=_grade(row.material_grade),
            icon_url=row.item_icon_url,
            points=(amount // row.quantity if eligible and row.quantity else 0),
        )
        db.add(catalog)

    note = (body.note or "").strip() or None
    if not eligible:
        extra = (
            "Itinerario competitivo: ingreso sin puntos"
            if path == UserPath.COMPETITIVE
            else "Sin itinerario de campaña/híbrido: ingreso sin puntos"
        )
        note = f"{note} · {extra}" if note else extra

    row.status = "approved"
    row.awarded_points = awarded
    row.admin_note = note
    row.resolved_by = admin.id
    row.resolved_at = now
    row.point_transaction_id = tx.id if tx else None
    db.commit()
    db.refresh(row)
    return _dump_requests(db, [row])[0]


@router.post("/admin/requests/{request_id}/complete")
def complete_withdrawal(
    request_id: UUID,
    body: ResolveBody,
    admin: User = Depends(require_guild_admin),
    db: Session = Depends(get_db),
):
    row = db.query(BankRequest).filter(BankRequest.id == request_id).first()
    if not row:
        raise HTTPException(404, "Solicitud no encontrada")
    if row.kind != "withdrawal":
        raise HTTPException(400, "Los ingresos se aprueban, no se marcan como entregados")
    if row.status != "pending":
        raise HTTPException(400, "Esta solicitud ya se resolvió")
    row.status = "completed"
    row.admin_note = (body.note or "").strip() or None
    row.resolved_by = admin.id
    row.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return _dump_requests(db, [row])[0]


@router.post("/admin/requests/{request_id}/reject")
def reject_request(
    request_id: UUID,
    body: ResolveBody,
    admin: User = Depends(require_guild_admin),
    db: Session = Depends(get_db),
):
    row = db.query(BankRequest).filter(BankRequest.id == request_id).first()
    if not row:
        raise HTTPException(404, "Solicitud no encontrada")
    if row.status != "pending":
        raise HTTPException(400, "Esta solicitud ya se resolvió")
    note = (body.note or "").strip()
    if not note:
        raise HTTPException(400, "Indica un motivo para rechazar")
    row.status = "rejected"
    row.admin_note = note
    row.resolved_by = admin.id
    row.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return _dump_requests(db, [row])[0]
