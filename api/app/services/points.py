"""
Motor de puntos. Las funciones no hacen commit: lo hace quien las llama.

- Competitivo: M+, raid y JcJ. Campaña: todo lo demás (eventos, lore, logros,
  paseo en el tiempo, housing, farmeo, profesiones, profundidades, reputaciones).
- Cada semana (reset de WoW EU) suma tope según el itinerario de la temporada:
  500 competitivos, 500 de campaña o 250 + 250 en híbrido. El tope no usado se
  acumula: en la semana N desde que la temporada puntúa (points_start_at) caben
  N × tope menos lo ya contado. Antes de points_start_at no se puntúa nada.
  Los puntos que pasan del tope no se acumulan: se pierden.
- Se llena por orden cronológico; el evento que cruza el tope cuenta en parte.
- Lo que da o quita un admin (weekly_capped = false) siempre cuenta y no consume tope.
- Sin itinerario elegido no cuenta ningún evento con tope. El jugador lo fija
  al tener main; un admin puede corregirlo y se recalcula la temporada.
"""

from datetime import datetime, timedelta

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.enums import EventCategory
from app.models.point_transaction import PointTransaction
from app.models.season import Season
from app.models.user import User, UserPath
from app.services import seasons as season_service
from app.services.weeks import week_start

COMPETITIVE = {EventCategory.MYTHIC_PLUS, EventCategory.RAID, EventCategory.PVP}

WEEKLY_CAP = 500
WEEKLY_CAPS = {
    UserPath.COMPETITIVE: {"competitive": WEEKLY_CAP, "campaign": 0},
    UserPath.CAMPAIGN: {"competitive": 0, "campaign": WEEKLY_CAP},
    UserPath.HYBRID: {"competitive": WEEKLY_CAP // 2, "campaign": WEEKLY_CAP // 2},
}


def bucket(category: EventCategory | None) -> str:
    return "competitive" if category in COMPETITIVE else "campaign"


def mythic_plus_points(level: int, timed: bool) -> int:
    """Tabla de la regla 2; desde +14 son 80 y cada nivel suma 20. Fuera de tiempo, la mitad."""
    if level < 2:
        return 0
    if level <= 5:
        base = 10
    elif level <= 9:
        base = 20
    elif level <= 11:
        base = 30
    elif level <= 13:
        base = 40
    else:
        base = 80 + 20 * (level - 14)
    return base if timed else base // 2


def effective_amount(tx: PointTransaction) -> int:
    """Puntos que suma la transacción: lo que cupo en el tope, o todo si va fuera del tope."""
    return (tx.counted_amount or 0) if tx.weekly_capped else tx.amount


def chosen_path(db: Session, user_id, season: Season) -> UserPath | None:
    """Itinerario ya guardado. None si el jugador todavía no lo ha elegido."""
    choice = season_service.season_path(db, user_id, season.id)
    return choice.path if choice else None


def season_itinerary(db: Session, user_id, at: datetime | None = None) -> UserPath | None:
    """Itinerario elegido para la temporada en curso. None si aún no lo ha fijado."""
    season = season_service.current_season(db, at=at)
    if not season:
        return None
    choice = season_service.season_path(db, user_id, season.id)
    return choice.path if choice else None


def scores_guild_bank(path: UserPath | None) -> bool:
    """Solo Campaña e Híbrido puntúan por meter materiales al banco. Competitivo, no."""
    return path in (UserPath.CAMPAIGN, UserPath.HYBRID)


def record_capped_event(
    db: Session,
    *,
    user_id,
    amount: int,
    reason: str,
    category: EventCategory,
    occurred_at: datetime,
    character_id=None,
    processed_run_id=None,
) -> PointTransaction | None:
    """
    Registra un evento sujeto al tope semanal y recalcula la temporada del jugador.
    None si no hay temporada o si ocurrió antes de que la temporada puntuara en la web.
    """
    if amount <= 0:
        raise ValueError("Los eventos con tope deben sumar puntos; las restas son ajustes de admin")
    season = season_service.current_season(db, at=occurred_at)
    if season is None or occurred_at < points_start(season):
        return None

    tx = PointTransaction(
        user_id=user_id,
        character_id=character_id,
        amount=amount,
        reason=reason,
        event_category=category,
        occurred_at=occurred_at,
        week_start=week_start(occurred_at),
        season_id=season.id,
        weekly_capped=True,
        counted_amount=0,
        processed_run_id=processed_run_id,
    )
    db.add(tx)
    db.flush()
    recalculate_season(db, user_id, season)
    return tx


def points_start(season: Season) -> datetime:
    return season.points_start_at or season.start_date


def week_number(season: Season, at: datetime) -> int:
    """1 en la semana en que la temporada empieza a puntuar, 2 en la siguiente…"""
    return (week_start(at) - week_start(points_start(season))) // timedelta(days=7) + 1


def _capped_rows(db: Session, user_id, season: Season) -> list[PointTransaction]:
    rows = (
        db.query(PointTransaction)
        .filter(
            PointTransaction.user_id == user_id,
            PointTransaction.season_id == season.id,
            PointTransaction.weekly_capped.is_(True),
            PointTransaction.active.is_(True),
        )
        .all()
    )
    rows.sort(key=lambda t: (t.occurred_at or t.created_at, t.created_at, str(t.id)))
    return rows


def recalculate_season(db: Session, user_id, season: Season) -> None:
    """
    Reparte el tope acumulado de la temporada en orden cronológico y ajusta
    total_points con la diferencia. Un evento que llega tarde puede cambiar lo que
    cuentan los posteriores, por eso se recalcula la temporada entera.
    """
    rows = _capped_rows(db, user_id, season)
    if not rows:
        return

    path = chosen_path(db, user_id, season)
    if path is None:
        delta = 0
        for t in rows:
            delta += 0 - (t.counted_amount or 0)
            t.counted_amount = 0
        if delta:
            db.query(User).filter(User.id == user_id).update(
                {User.total_points: User.total_points + delta}, synchronize_session="fetch"
            )
        db.flush()
        return

    caps = WEEKLY_CAPS[path]
    used = {name: 0 for name in caps}

    delta = 0
    for t in rows:
        name = bucket(t.event_category)
        available = caps[name] * week_number(season, t.occurred_at or t.created_at) - used[name]
        counted = max(0, min(t.amount, available))
        used[name] += counted
        delta += counted - (t.counted_amount or 0)
        t.counted_amount = counted

    if delta:
        db.query(User).filter(User.id == user_id).update(
            {User.total_points: User.total_points + delta}, synchronize_session="fetch"
        )
    db.flush()


def cap_status(db: Session, user_id, season: Season, path: UserPath, at: datetime) -> dict:
    """Tope acumulado hasta la semana de `at`, lo ya contado y lo que queda, por tipo."""
    week = week_number(season, at)
    used = {name: 0 for name in WEEKLY_CAPS[path]}
    for t in _capped_rows(db, user_id, season):
        used[bucket(t.event_category)] += t.counted_amount or 0
    return {
        name: {"accrued": cap * week, "used": used[name], "available": cap * week - used[name]}
        for name, cap in WEEKLY_CAPS[path].items()
    }


def apply_user_delta(db: Session, user_id, delta: int) -> None:
    if not delta:
        return
    db.query(User).filter(User.id == user_id).update(
        {User.total_points: User.total_points + delta},
        synchronize_session="fetch",
    )


def _season_of(db: Session, tx: PointTransaction) -> Season | None:
    if not tx.season_id:
        return None
    return db.query(Season).filter(Season.id == tx.season_id).first()


def void_transaction(db: Session, tx: PointTransaction, note: str) -> PointTransaction:
    """Anula una asignación. El tope de esa semana se recalcula; hace falta un motivo."""
    note = note.strip()
    if not note:
        raise ValueError("Indica el motivo de la anulación")
    if not tx.active:
        raise ValueError("Esta asignación ya está anulada")
    gained = effective_amount(tx)
    tx.active = False
    tx.admin_note = note
    apply_user_delta(db, tx.user_id, -gained)
    season = _season_of(db, tx)
    if tx.weekly_capped and season:
        recalculate_season(db, tx.user_id, season)
    db.flush()
    return tx


def update_transaction_amount(db: Session, tx: PointTransaction, amount: int, note: str) -> PointTransaction:
    """Cambia los puntos de una asignación activa. El motivo queda en admin_note."""
    note = note.strip()
    if not note:
        raise ValueError("Indica el motivo del cambio")
    if not tx.active:
        raise ValueError("No se puede editar una asignación anulada")
    if amount == tx.amount:
        tx.admin_note = note
        db.flush()
        return tx
    if tx.weekly_capped:
        if amount <= 0:
            raise ValueError("La cantidad debe ser mayor que 0")
        tx.amount = amount
        tx.admin_note = note
        season = _season_of(db, tx)
        if season:
            recalculate_season(db, tx.user_id, season)
    else:
        apply_user_delta(db, tx.user_id, amount - tx.amount)
        tx.amount = amount
        tx.admin_note = note
    db.flush()
    return tx


def season_points(db: Session, season: Season, user_ids=None) -> dict:
    """Puntos que cuentan en la temporada, por usuario (incluye los ajustes de admin)."""
    when = func.coalesce(PointTransaction.occurred_at, PointTransaction.created_at)
    counted = case(
        (PointTransaction.weekly_capped.is_(True), func.coalesce(PointTransaction.counted_amount, 0)),
        else_=PointTransaction.amount,
    )
    q = db.query(PointTransaction.user_id, func.sum(counted)).filter(
        PointTransaction.active.is_(True),
        when >= season.start_date,
    )
    if season.end_date is not None:
        q = q.filter(when < season.end_date)
    if user_ids is not None:
        q = q.filter(PointTransaction.user_id.in_(list(user_ids)))
    return {uid: int(total) for uid, total in q.group_by(PointTransaction.user_id)}
