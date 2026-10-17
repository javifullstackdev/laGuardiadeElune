from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.season import Season
from app.models.user import User
from app.services import seasons as season_service
from app.services.blizzard import BlizzardError

router = APIRouter(prefix="/seasons", tags=["seasons"])


@router.get("/current")
def get_current_season(db: Session = Depends(get_db)):
    season = season_service.current_season(db)
    return season_service.serialize(season) if season else None


@router.get("/")
def list_seasons(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = (
        db.query(Season)
        .filter(Season.deleted_at.is_(None))
        .order_by(Season.start_date.desc())
        .all()
    )
    return [season_service.serialize(s) for s in rows]


@router.post("/sync")
async def sync_seasons(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Trae de Blizzard la temporada de míticas+ actual y cierra las que hayan terminado."""
    try:
        synced = await season_service.sync_from_blizzard(db)
    except BlizzardError as exc:
        raise HTTPException(502, str(exc))
    return [season_service.serialize(s) for s in synced]
