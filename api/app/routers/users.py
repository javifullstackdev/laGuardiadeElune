from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
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
        # Battle.net
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