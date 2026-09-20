from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.models.point_transaction import PointTransaction

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
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
    limit: int = 10,
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
def list_players(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Lista todos los jugadores para el panel de admin.
    Incluye puntos, rol, cumpleaños y número de personajes.
    """
    from app.models.character import Character
    from sqlalchemy import func as sqlfunc

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


@router.get("/ranking")
def get_ranking(    limit: int = Query(default=20, le=50),
    db: Session = Depends(get_db),
):
    """
    Ranking público — no requiere autenticación.
    Devuelve los N usuarios con más puntos incluyendo su personaje main.

    Usamos SQL raw con text() porque el JOIN condicional es más legible
    que encadenar múltiples .join() de SQLAlchemy en este caso.
    """
    rows = db.execute(
        text("""
            SELECT
                u.username,
                u.discord_id,
                u.total_points,
                u.avatar_url,
                u.guild_title,
                c.name        AS char_name,
                c.realm       AS char_realm,
                c.wow_class   AS char_class,
                c.role_function,
                c.is_verified
            FROM users u
            LEFT JOIN characters c
                ON  c.user_id    = u.id
                AND c.is_main    = true
                AND c.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
            ORDER BY u.total_points DESC
            LIMIT :limit
        """),
        {"limit": limit},
    ).fetchall()

    return [
        {
            "position":     pos,
            "username":     r.username,
            "discord_id":   r.discord_id,
            "total_points": r.total_points,
            "avatar_url":   r.avatar_url,
            "guild_title":  r.guild_title,
            "character": {
                "name":          r.char_name,
                "realm":         r.char_realm,
                "wow_class":     r.char_class,
                "role_function": r.role_function,
                "is_verified":   r.is_verified,
            } if r.char_name else None,
        }
        for pos, r in enumerate(rows, start=1)
    ]