from collections import defaultdict

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func as sqlfunc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, timezone
from app.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.user import User, UserPath
from app.models.user_season_path import UserSeasonPath
from app.models.character import Character
from app.models.point_transaction import PointTransaction
from app.models.processed_run import ProcessedRun
from app.routers.auth import fetch_guild_nick, fetch_guild_nicks
from app.services import points as points_service
from app.services import seasons as season_service
from app.urls import static_url

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    nick = await fetch_guild_nick(current_user.discord_id)
    if nick and nick != current_user.username:
        current_user.username = nick
        db.commit()
        db.refresh(current_user)

    token_expired = False
    if current_user.blizzard_access_token and current_user.blizzard_token_expires_at:
        expires = current_user.blizzard_token_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        token_expired = expires <= datetime.now(timezone.utc)

    season = season_service.current_season(db)
    choice = season_service.season_path(db, current_user.id, season.id) if season else None

    return {
        "id": str(current_user.id),
        "username": current_user.display_name or current_user.username,
        "discord_username": current_user.username,
        "display_name": current_user.display_name,
        "discord_id": current_user.discord_id,
        "guild_title": current_user.guild_title,
        "total_points": current_user.total_points,
        "season_points": (
            points_service.season_points(db, season, [current_user.id]).get(current_user.id, 0)
            if season
            else 0
        ),
        "avatar_url": current_user.avatar_url,
        "role": current_user.role.value,
        "path": choice.path.value if choice else None,
        "points_cap": (
            points_service.cap_status(
                db, current_user.id, season, choice.path, datetime.now(timezone.utc)
            )
            if season and choice
            else None
        ),
        "season": season_service.serialize(season) if season else None,
        "blizzard_battletag": current_user.blizzard_battletag,
        "has_blizzard": current_user.blizzard_access_token is not None,
        "blizzard_token_expired": token_expired,
        "birthday": current_user.birthday.isoformat() if current_user.birthday else None,
    }


class BirthdayInput(BaseModel):
    birthday: date


@router.patch("/me/birthday")
def set_my_birthday(
    data: BirthdayInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Establece la fecha de nacimiento del usuario.
    - Si aún no tiene cumpleaños → cualquier usuario puede establecerlo.
    - Si ya tiene cumpleaños y no es admin/officer → devuelve 403.
    - Admin/officer siempre pueden modificarlo.
    """
    if (
        current_user.birthday is not None
        and current_user.role.value not in ("admin", "officer")
    ):
        raise HTTPException(
            status_code=403,
            detail="Ya tienes una fecha de nacimiento guardada. Pide al Líder que la modifique si hay un error.",
        )

    current_user.birthday = data.birthday
    db.commit()
    return {"birthday": current_user.birthday.isoformat()}


@router.patch("/users/{user_id}/birthday")
def set_user_birthday(
    user_id: str,
    data: BirthdayInput,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Permite a admin/officer cambiar el cumpleaños de cualquier usuario."""
    from uuid import UUID
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.birthday = data.birthday
    db.commit()
    return {"birthday": user.birthday.isoformat()}


class DisplayNameInput(BaseModel):
    display_name: Optional[str] = None


@router.patch("/{user_id}/display-name")
def set_user_display_name(
    user_id: str,
    data: DisplayNameInput,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: apodo visible en el ranking (independiente del nick de Discord)."""
    from uuid import UUID
    user = db.query(User).filter(User.id == UUID(user_id), User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    name = (data.display_name or "").strip()
    if len(name) > 255:
        raise HTTPException(400, "El apodo no puede superar 255 caracteres")
    user.display_name = name or None
    db.commit()
    return {
        "id": str(user.id),
        "display_name": user.display_name,
        "username": user.display_name or user.username,
        "discord_username": user.username,
    }


@router.get("/me/transactions")
def get_my_transactions(
    limit: int = Query(default=200, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve el historial de puntos del usuario autenticado."""
    transactions = (
        db.query(PointTransaction)
        .filter(PointTransaction.user_id == current_user.id, PointTransaction.active.is_(True))
        .order_by(
            sqlfunc.coalesce(PointTransaction.occurred_at, PointTransaction.created_at).desc(),
            PointTransaction.created_at.desc(),
        )
        .limit(limit)
        .all()
    )
    run_ids = [t.processed_run_id for t in transactions if t.processed_run_id]
    runs = {
        row.id: row
        for row in db.query(ProcessedRun).filter(ProcessedRun.id.in_(run_ids)).all()
    } if run_ids else {}

    def display_reason(t: PointTransaction) -> str:
        reason = t.reason or ""
        names = (runs.get(t.processed_run_id).guild_character_names or "").strip() if t.processed_run_id and t.processed_run_id in runs else ""
        if names and names not in reason:
            return f"{reason} — {names}"
        return reason

    return [
        {
            "amount": t.amount,
            "reason": display_reason(t),
            "event_category": t.event_category.value if t.event_category else None,
            "bucket": points_service.bucket(t.event_category),
            "created_at": t.created_at.isoformat(),
            "occurred_at": (t.occurred_at or t.created_at).isoformat(),
            "week_start": t.week_start.isoformat() if t.week_start else None,
            "weekly_capped": t.weekly_capped,
            "counted_amount": points_service.effective_amount(t),
        }
        for t in transactions
    ]


@router.patch("/me/path")
def set_my_path(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elige el itinerario de la temporada en curso. Solo una vez por temporada."""
    path_value = str(data.get("path", "")).upper()
    try:
        path = UserPath[path_value]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Itinerario '{path_value}' no válido")

    season = season_service.current_season(db)
    if not season:
        raise HTTPException(409, "Todavía no hay una temporada en curso")
    if season_service.season_path(db, current_user.id, season.id):
        raise HTTPException(409, f"Ya elegiste itinerario para «{season.name}»")

    db.add(UserSeasonPath(user_id=current_user.id, season_id=season.id, path=path))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"Ya elegiste itinerario para «{season.name}»")
    return {"path": path.value, "season": season_service.serialize(season)}


@router.get("/admin/players")
async def list_players(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Lista todos los jugadores para el panel de admin.
    Incluye puntos, rol, cumpleaños y número de personajes.
    Sincroniza el apodo de Discord del servidor antes de devolver la lista.
    """
    from app.models.character import Character
    from sqlalchemy import func as sqlfunc

    nicks = await fetch_guild_nicks()
    if not nicks:
        # Listado masivo requiere Server Members Intent; fallback miembro a miembro
        players = db.query(User).filter(User.deleted_at.is_(None)).all()
        nicks = {}
        for u in players:
            nick = await fetch_guild_nick(u.discord_id)
            if nick:
                nicks[u.discord_id] = nick

    if nicks:
        dirty = False
        for u in db.query(User).filter(User.deleted_at.is_(None)).all():
            nick = nicks.get(u.discord_id)
            if nick and nick != u.username:
                u.username = nick
                dirty = True
        if dirty:
            db.commit()

    rows = (
        db.query(
            User,
            sqlfunc.count(Character.id).label("character_count"),
        )
        .outerjoin(
            Character,
            (Character.user_id == User.id) & (Character.deleted_at.is_(None)),
        )
        .filter(User.deleted_at.is_(None))
        .group_by(User.id)
        .order_by(User.total_points.desc())
        .all()
    )

    return [
        {
            "id":              str(u.id),
            "username":        u.display_name or u.username,
            "display_name":    u.display_name,
            "discord_username": u.username,
            "discord_id":      u.discord_id,
            "guild_title":     u.guild_title,
            "role":            u.role.value,
            "total_points":    u.total_points,
            "avatar_url":      u.avatar_url,
            "birthday":        u.birthday.isoformat() if u.birthday else None,
            "character_count": count,
        }
        for u, count in rows
    ]


def _character_avatar(char: Character) -> str | None:
    """Solo ranking: cara propia > cara Blizzard. Nunca imagen completa ni render de cuerpo."""
    if char.custom_face_url:
        return static_url(char.custom_face_url)
    if char.face_url:
        return char.face_url
    if char.render_url and char.render_url.rstrip("/").endswith("-avatar.jpg"):
        return char.render_url
    return None


@router.get("/ranking")
def get_ranking(
    limit: int = Query(default=20, le=50),
    db: Session = Depends(get_db),
):
    """
    Ranking público — no requiere autenticación.
    Posición por puntos de la temporada en curso con empates (mismo score → misma
    posición; ranking denso: 1, 1, 2…). Sin temporada, por el total.
    Nombre visible: display_name (admin) o username Discord.
    """
    season = season_service.current_season(db)
    candidates = db.query(User).filter(User.deleted_at.is_(None)).all()
    scores = points_service.season_points(db, season) if season else {}

    def score(u: User) -> int:
        return scores.get(u.id, 0) if season else u.total_points

    users = sorted(candidates, key=lambda u: (-score(u), -u.total_points, u.username.lower()))[:limit]
    if not users:
        return []

    chars = (
        db.query(Character)
        .filter(
            Character.user_id.in_([u.id for u in users]),
            Character.deleted_at.is_(None),
        )
        .all()
    )
    by_user: dict = defaultdict(list)
    for char in chars:
        by_user[char.user_id].append(char)

    result = []
    last_points: int | None = None
    position = 0
    for user in users:
        if last_points is None or score(user) != last_points:
            position += 1
            last_points = score(user)

        roster = sorted(
            by_user.get(user.id, []),
            key=lambda c: (not c.is_main, -(c.level or 0), c.name.lower()),
        )[:3]
        featured = []
        for char in roster:
            featured.append(
                {
                    "name": char.name,
                    "realm": char.realm,
                    "wow_class": char.wow_class.value if char.wow_class else None,
                    "is_main": char.is_main,
                    "is_verified": char.is_verified,
                    "avatar_url": _character_avatar(char),
                    "level": char.level,
                }
            )
        main = next((c for c in featured if c["is_main"]), featured[0] if featured else None)

        result.append(
            {
                "position": position,
                "username": user.display_name or user.username,
                "display_name": user.display_name,
                "discord_username": user.username,
                "discord_id": user.discord_id,
                "season_points": scores.get(user.id, 0),
                "total_points": user.total_points,
                "avatar_url": user.avatar_url,
                "guild_title": user.guild_title,
                "characters": featured,
                # Compatibilidad con clientes antiguos
                "character": {
                    "name": main["name"],
                    "realm": main["realm"],
                    "wow_class": main["wow_class"],
                    "role_function": None,
                    "is_verified": main["is_verified"],
                }
                if main
                else None,
            }
        )

    return result