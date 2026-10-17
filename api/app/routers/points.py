from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.services import mplus_sync
from app.services.blizzard import BlizzardError

router = APIRouter(prefix="/points", tags=["points"])


@router.post("/sync-mythic-plus")
async def sync_mythic_plus(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Revisa en Raider.io las M+ recientes de los personajes verificados y puntúa las nuevas."""
    try:
        return await mplus_sync.sync_mythic_plus(db)
    except BlizzardError as exc:
        raise HTTPException(502, str(exc))
