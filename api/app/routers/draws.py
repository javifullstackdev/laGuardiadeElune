"""Peñas privadas entre miembros. La web no cobra: el Bizum se hace fuera."""

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.draw import GuildDraw, GuildDrawEntry
from app.models.user import User
from app.services.image_bytes import read_image
from app.urls import static_url

router = APIRouter(prefix="/draws", tags=["draws"])

MADRID = ZoneInfo("Europe/Madrid")
MIN_SHARE_CENTS = 50
MAX_PRICE_CENTS = 10_000
DRAW_UPLOAD_DIR = Path("uploads/draws")
DRAW_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_IMAGE_SIZE = 5 * 1024 * 1024
OPEN = "open"
CLOSED = "closed"
DRAWN = "drawn"
CANCELLED = "cancelled"


class DrawIn(BaseModel):
    title: str
    summary: str | None = None
    price_euros: float
    draw_at: str
    signup_closes_at: str
    payment_due_at: str
    bizum_phone: str
    bizum_name: str
    organizer_participates: bool = True


class DrawPatch(BaseModel):
    title: str | None = None
    summary: str | None = None
    price_euros: float | None = None
    draw_at: str | None = None
    signup_closes_at: str | None = None
    payment_due_at: str | None = None
    bizum_phone: str | None = None
    bizum_name: str | None = None
    ticket_number: str | None = None
    ticket_series: str | None = None


class JoinIn(BaseModel):
    accepted: bool = False


def _name(user: User | None) -> str:
    if user is None:
        return ""
    return user.display_name or user.username


def _parse_when(value: str, label: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        raise HTTPException(400, f"La fecha de {label} no es válida")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=MADRID)
    return parsed


def _cents(euros: float) -> int:
    try:
        amount = Decimal(str(euros))
    except Exception:
        raise HTTPException(400, "El precio no es válido")
    cents = int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if cents < MIN_SHARE_CENTS or cents > MAX_PRICE_CENTS:
        raise HTTPException(400, "El precio tiene que estar entre 0,50 € y 100 €, sin recargo")
    return cents


def _phone(value: str) -> str:
    compact = "".join(value.split())
    digits = compact[1:] if compact.startswith("+") else compact
    if not digits.isdigit() or not 9 <= len(digits) <= 15:
        raise HTTPException(400, "El teléfono de Bizum no es válido")
    return compact


def _text(value: str | None, label: str, limit: int, required: bool = False) -> str | None:
    cleaned = (value or "").strip()
    if not cleaned:
        if required:
            raise HTTPException(400, f"Falta {label}")
        return None
    if len(cleaned) > limit:
        raise HTTPException(400, f"{label} es demasiado largo")
    return cleaned


def _check_dates(signup: datetime, payment: datetime, draw_at: datetime) -> None:
    if not signup < payment <= draw_at:
        raise HTTPException(
            400,
            "El cierre de la lista va antes del Bizum, y el Bizum como muy tarde el día del sorteo",
        )


def assign_shares(price_cents: int, user_ids: list, organizer_id) -> dict:
    """Parte igual. Los céntimos que sobran se quedan en quien compra, si participa."""
    count = len(user_ids)
    if count == 0:
        return {}
    base = price_cents // count
    remainder = price_cents % count
    organizer_in = organizer_id in user_ids
    return {
        user_id: base + (remainder if organizer_in and user_id == organizer_id else 0)
        for user_id in user_ids
    }


def _ensure_min(shares: dict) -> None:
    if any(amount < MIN_SHARE_CENTS for amount in shares.values()):
        raise HTTPException(
            400,
            "Cada parte tiene que ser de al menos 0,50 €. Con este precio no caben más participantes.",
        )


def _unlink_image(path: str | None) -> None:
    if not path or path.startswith("http://") or path.startswith("https://"):
        return
    target = Path("uploads") / path
    target.unlink(missing_ok=True)


def _active(entries: list[GuildDrawEntry]) -> list[GuildDrawEntry]:
    return [entry for entry in entries if entry.dropped_at is None]


def _shares_for(draw: GuildDraw, entries: list[GuildDrawEntry]) -> dict:
    active = _active(entries)
    if draw.status == OPEN or any(entry.share_cents is None for entry in active):
        shares = assign_shares(draw.price_cents, [entry.user_id for entry in active], draw.organizer_id)
    else:
        shares = {entry.user_id: entry.share_cents or 0 for entry in active}
    return shares


def _entry_out(entry: GuildDrawEntry, draw: GuildDraw, share: int | None) -> dict:
    return {
        "user_id": str(entry.user_id),
        "name": _name(entry.user),
        "share_cents": share,
        "paid": entry.paid_at is not None,
        "dropped": entry.dropped_at is not None,
        "is_organizer": entry.user_id == draw.organizer_id,
    }


def _draw_out(draw: GuildDraw, entries: list[GuildDrawEntry], viewer: User) -> dict:
    shares = _shares_for(draw, entries)
    mine = next((entry for entry in entries if entry.user_id == viewer.id), None)
    active_mine = mine is not None and mine.dropped_at is None
    ordered = sorted(
        entries,
        key=lambda entry: (
            entry.dropped_at is not None,
            entry.user_id != draw.organizer_id,
            _name(entry.user).lower(),
        ),
    )
    return {
        "id": str(draw.id),
        "title": draw.title,
        "summary": draw.summary,
        "price_cents": draw.price_cents,
        "draw_at": draw.draw_at.isoformat(),
        "signup_closes_at": draw.signup_closes_at.isoformat(),
        "payment_due_at": draw.payment_due_at.isoformat(),
        "status": draw.status,
        "signup_open": draw.status == OPEN and datetime.now(timezone.utc) < draw.signup_closes_at,
        "ticket_number": draw.ticket_number,
        "ticket_series": draw.ticket_series,
        "bizum_phone": draw.bizum_phone,
        "bizum_name": draw.bizum_name,
        "image_url": static_url(draw.image_url),
        "organizer_id": str(draw.organizer_id),
        "organizer_name": _name(draw.organizer),
        "participant_count": len(shares),
        "buyer_retained_cents": draw.price_cents - sum(shares.values()),
        "my_joined": active_mine,
        "my_share_cents": shares.get(viewer.id) if active_mine else None,
        "my_paid": bool(mine and mine.paid_at and mine.dropped_at is None),
        "entries": [
            _entry_out(
                entry,
                draw,
                None if entry.dropped_at is not None else shares.get(entry.user_id),
            )
            for entry in ordered
        ],
    }


def _load(db: Session, draw_id: UUID) -> tuple[GuildDraw, list[GuildDrawEntry]]:
    draw = db.query(GuildDraw).filter(GuildDraw.id == draw_id).first()
    if draw is None:
        raise HTTPException(404, "Ese sorteo no existe")
    entries = (
        db.query(GuildDrawEntry)
        .options(joinedload(GuildDrawEntry.user))
        .filter(GuildDrawEntry.draw_id == draw.id)
        .all()
    )
    return draw, entries


def _list(db: Session, viewer: User) -> list[dict]:
    draws = db.query(GuildDraw).order_by(GuildDraw.draw_at.desc()).all()
    if not draws:
        return []
    ids = [draw.id for draw in draws]
    grouped: dict = {draw.id: [] for draw in draws}
    rows = (
        db.query(GuildDrawEntry)
        .options(joinedload(GuildDrawEntry.user))
        .filter(GuildDrawEntry.draw_id.in_(ids))
        .all()
    )
    for row in rows:
        grouped[row.draw_id].append(row)
    rank = {OPEN: 0, CLOSED: 1, DRAWN: 2, CANCELLED: 3}
    payload = [_draw_out(draw, grouped[draw.id], viewer) for draw in draws]
    payload.sort(key=lambda item: (rank.get(item["status"], 9), item["draw_at"]))
    return payload


@router.get("")
def list_draws(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _list(db, current_user)


def _preview(draw: GuildDraw) -> dict:
    """Datos públicos para la vista previa al compartir. Sin Bizum ni participantes."""
    return {
        "id": str(draw.id),
        "title": draw.title,
        "summary": draw.summary,
        "image_url": static_url(draw.image_url),
        "draw_at": draw.draw_at.isoformat(),
    }


@router.get("/{draw_id}/preview")
def preview_draw(draw_id: UUID, db: Session = Depends(get_db)):
    draw = db.query(GuildDraw).filter(GuildDraw.id == draw_id).first()
    if draw is None:
        raise HTTPException(404, "Ese sorteo no existe")
    return _preview(draw)


@router.get("/{draw_id}")
def get_draw(
    draw_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    draw, entries = _load(db, draw_id)
    return _draw_out(draw, entries, current_user)


@router.post("")
def create_draw(
    body: DrawIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    title = _text(body.title, "el título", 160, required=True)
    summary = _text(body.summary, "La nota", 2000)
    price = _cents(body.price_euros)
    signup = _parse_when(body.signup_closes_at, "cierre de la lista")
    payment = _parse_when(body.payment_due_at, "límite del Bizum")
    draw_at = _parse_when(body.draw_at, "el sorteo")
    _check_dates(signup, payment, draw_at)
    if draw_at <= datetime.now(timezone.utc):
        raise HTTPException(400, "El sorteo tiene que ser una fecha futura")
    draw = GuildDraw(
        organizer_id=admin.id,
        title=title,
        summary=summary,
        price_cents=price,
        draw_at=draw_at,
        signup_closes_at=signup,
        payment_due_at=payment,
        status=OPEN,
        bizum_phone=_phone(body.bizum_phone),
        bizum_name=_text(body.bizum_name, "el titular del Bizum", 120, required=True),
    )
    db.add(draw)
    db.flush()
    if body.organizer_participates:
        db.add(
            GuildDrawEntry(
                draw_id=draw.id,
                user_id=admin.id,
                accepted_at=datetime.now(timezone.utc),
            )
        )
    db.commit()
    return _list(db, admin)


@router.patch("/{draw_id}")
def update_draw(
    draw_id: UUID,
    body: DrawPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    draw, entries = _load(db, draw_id)
    data = body.model_dump(exclude_unset=True)
    money = {"price_euros", "draw_at", "signup_closes_at", "payment_due_at"}
    if draw.status != OPEN and money & set(data):
        raise HTTPException(400, "El precio y las fechas solo se cambian mientras la lista está abierta")
    if "title" in data:
        draw.title = _text(data["title"], "el título", 160, required=True)
    if "summary" in data:
        draw.summary = _text(data["summary"], "La nota", 2000)
    if "price_euros" in data:
        draw.price_cents = _cents(data["price_euros"])
        _ensure_min(assign_shares(draw.price_cents, [e.user_id for e in _active(entries)], draw.organizer_id))
    if "bizum_phone" in data:
        draw.bizum_phone = _phone(data["bizum_phone"])
    if "bizum_name" in data:
        draw.bizum_name = _text(data["bizum_name"], "el titular del Bizum", 120, required=True)
    if "ticket_number" in data:
        draw.ticket_number = _text(data["ticket_number"], "El número", 32)
    if "ticket_series" in data:
        draw.ticket_series = _text(data["ticket_series"], "La serie", 32)
    signup = _parse_when(data["signup_closes_at"], "cierre de la lista") if "signup_closes_at" in data else draw.signup_closes_at
    payment = _parse_when(data["payment_due_at"], "límite del Bizum") if "payment_due_at" in data else draw.payment_due_at
    draw_at = _parse_when(data["draw_at"], "el sorteo") if "draw_at" in data else draw.draw_at
    if {"signup_closes_at", "payment_due_at", "draw_at"} & set(data):
        _check_dates(signup, payment, draw_at)
        draw.signup_closes_at = signup
        draw.payment_due_at = payment
        draw.draw_at = draw_at
    db.commit()
    return _list(db, admin)


@router.post("/{draw_id}/close")
def close_draw(
    draw_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    draw, entries = _load(db, draw_id)
    if draw.status != OPEN:
        raise HTTPException(400, "La lista ya no está abierta")
    active = _active(entries)
    if not active:
        raise HTTPException(400, "Tiene que haber al menos un participante")
    shares = assign_shares(draw.price_cents, [entry.user_id for entry in active], draw.organizer_id)
    _ensure_min(shares)
    now = datetime.now(timezone.utc)
    for entry in active:
        entry.share_cents = shares[entry.user_id]
        if entry.user_id == draw.organizer_id:
            entry.paid_at = now
    draw.status = CLOSED
    draw.closed_at = now
    db.commit()
    return _list(db, admin)


@router.post("/{draw_id}/drawn")
def mark_drawn(
    draw_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    draw, _entries = _load(db, draw_id)
    if draw.status != CLOSED:
        raise HTTPException(400, "Primero hay que cerrar la lista y fijar las cuotas")
    if not draw.ticket_number:
        raise HTTPException(400, "Publica el número del décimo antes de marcarlo como sorteado")
    draw.status = DRAWN
    db.commit()
    return _list(db, admin)


@router.post("/{draw_id}/cancel")
def cancel_draw(
    draw_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    draw, _entries = _load(db, draw_id)
    if draw.status not in {OPEN, CLOSED}:
        raise HTTPException(400, "Este sorteo ya no se puede cancelar")
    draw.status = CANCELLED
    db.commit()
    return _list(db, admin)


@router.delete("/{draw_id}")
def delete_draw(
    draw_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Borra el sorteo y su lista. Sirve para quitar una peña de prueba."""
    draw, _entries = _load(db, draw_id)
    _unlink_image(draw.image_url)
    db.delete(draw)
    db.commit()
    return _list(db, admin)


@router.post("/{draw_id}/image")
async def upload_draw_image(
    draw_id: UUID,
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    draw, _entries = _load(db, draw_id)
    content, extension = await read_image(
        file, max_bytes=MAX_IMAGE_SIZE, too_big="La imagen no puede superar 5 MB"
    )
    filename = f"{uuid4().hex}.{extension}"
    (DRAW_UPLOAD_DIR / filename).write_bytes(content)
    _unlink_image(draw.image_url)
    draw.image_url = f"draws/{filename}"
    db.commit()
    return _list(db, admin)


@router.delete("/{draw_id}/image")
def delete_draw_image(
    draw_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    draw, _entries = _load(db, draw_id)
    _unlink_image(draw.image_url)
    draw.image_url = None
    db.commit()
    return _list(db, admin)


@router.post("/{draw_id}/join")
def join_draw(
    draw_id: UUID,
    body: JoinIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not body.accepted:
        raise HTTPException(400, "Hay que aceptar las condiciones para apuntarse")
    draw, entries = _load(db, draw_id)
    now = datetime.now(timezone.utc)
    if draw.status != OPEN or now >= draw.signup_closes_at:
        raise HTTPException(400, "La lista de este sorteo está cerrada")
    existing = next((entry for entry in entries if entry.user_id == current_user.id), None)
    if existing and existing.dropped_at is None:
        raise HTTPException(400, "Ya estás en la lista")
    if existing:
        existing.dropped_at = None
        existing.accepted_at = now
        existing.share_cents = None
        existing.paid_at = None
    else:
        created = GuildDrawEntry(
            draw_id=draw.id,
            user_id=current_user.id,
            accepted_at=now,
        )
        db.add(created)
        entries.append(created)
    shares = assign_shares(draw.price_cents, [entry.user_id for entry in _active(entries)], draw.organizer_id)
    _ensure_min(shares)
    db.commit()
    return _list(db, current_user)


@router.delete("/{draw_id}/join")
def leave_draw(
    draw_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    draw, entries = _load(db, draw_id)
    if draw.status != OPEN or datetime.now(timezone.utc) >= draw.signup_closes_at:
        raise HTTPException(400, "La lista ya está cerrada y la parte ha quedado fijada")
    existing = next((entry for entry in entries if entry.user_id == current_user.id and entry.dropped_at is None), None)
    if existing is None:
        raise HTTPException(400, "No estás en la lista")
    db.delete(existing)
    db.commit()
    return _list(db, current_user)


def _member_entry(draw: GuildDraw, entries: list[GuildDrawEntry], user_id: UUID) -> GuildDrawEntry:
    if draw.status != CLOSED:
        raise HTTPException(400, "Las cuotas todavía no están fijadas")
    entry = next((row for row in entries if row.user_id == user_id), None)
    if entry is None or entry.dropped_at is not None:
        raise HTTPException(404, "Ese participante no está en la lista")
    if entry.user_id == draw.organizer_id:
        raise HTTPException(400, "Quien compra el décimo no hace Bizum: su parte ya está pagada")
    return entry


@router.post("/{draw_id}/entries/{user_id}/paid")
def mark_paid(
    draw_id: UUID,
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    draw, entries = _load(db, draw_id)
    entry = _member_entry(draw, entries, user_id)
    entry.paid_at = datetime.now(timezone.utc)
    db.commit()
    return _list(db, admin)


@router.delete("/{draw_id}/entries/{user_id}/paid")
def unmark_paid(
    draw_id: UUID,
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    draw, entries = _load(db, draw_id)
    entry = _member_entry(draw, entries, user_id)
    entry.paid_at = None
    db.commit()
    return _list(db, admin)


@router.post("/{draw_id}/entries/{user_id}/drop")
def drop_unpaid(
    draw_id: UUID,
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    draw, entries = _load(db, draw_id)
    entry = _member_entry(draw, entries, user_id)
    if entry.paid_at is not None:
        raise HTTPException(400, "Primero quita la marca de pago")
    entry.dropped_at = datetime.now(timezone.utc)
    db.commit()
    return _list(db, admin)
