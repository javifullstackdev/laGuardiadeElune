from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.missions import list_for

router = APIRouter(prefix="/users", tags=["missions"])


@router.get("/me/missions")
def my_missions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Misiones del jugador. Si ya cumplió alguna, cobra los puntos aquí."""
    rows = list_for(db, current_user)
    db.commit()
    return rows
