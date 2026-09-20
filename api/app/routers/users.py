from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.dependencies import get_current_user
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
    }


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


@router.get("/ranking")
def get_ranking(
    limit: int = Query(default=20, le=50),
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