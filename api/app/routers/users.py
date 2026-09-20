from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models.user import User

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