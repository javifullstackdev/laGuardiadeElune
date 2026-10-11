from collections import defaultdict

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date, datetime, timezone
from app.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.models.character import Character
from app.models.point_transaction import PointTransaction
from app.routers.auth import fetch_guild_nick, fetch_guild_nicks
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

    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "discord_id": current_user.discord_id,
        "guild_title": current_user.guild_title,
        "total_points": current_user.total_points,
        "avatar_url": current_user.avatar_url,
        "role": current_user.role.value,
        "path": current_user.path.value,
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


@router.get("/me/transactions")
def get_my_transactions(
    limit: int = Query(default=200, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve el historial de puntos del usuario autenticado."""
    transactions = (
        db.query(PointTransaction)
        .filter(PointTransaction.user_id == current_user.id)
        .order_by(PointTransaction.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "amount": t.amount,
            "reason": t.reason,
            "event_category": t.event_category.value if t.event_category else None,
            "created_at": t.created_at.isoformat(),
        }
        for t in transactions
    ]


@router.patch("/me/path")
def set_my_path(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Actualiza el itinerario del usuario.
    En producción estará bloqueado durante la season activa.
    """
    from app.models.user import UserPath
    path_value = data.get("path", "").upper()
    try:
        current_user.path = UserPath[path_value]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Itinerario '{path_value}' no válido")
    db.commit()
    return {"path": current_user.path.value}


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
            "username":        u.username,
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
    Posición por puntos con empates (mismo score → misma posición; ranking
    tipo competición: 1, 2, 2, 4…).
    Incluye Discord avatar + main y hasta 2 alts (caras).
    """
    users = (
        db.query(User)
        .filter(User.deleted_at.is_(None))
        .order_by(User.total_points.desc(), User.username.asc())
        .limit(limit)
        .all()
    )
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
    for index, user in enumerate(users):
        if last_points is None or user.total_points != last_points:
            position = index + 1
            last_points = user.total_points

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
                "username": user.username,
                "discord_id": user.discord_id,
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