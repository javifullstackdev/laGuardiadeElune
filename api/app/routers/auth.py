import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models.user import User
from urllib.parse import quote

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI")
DISCORD_GUILD_ID = os.getenv("DISCORD_GUILD_ID")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/discord/login")
def discord_login():
    url = (
        "https://discord.com/oauth2/authorize"
        f"?client_id={DISCORD_CLIENT_ID}"
        f"&redirect_uri={quote(DISCORD_REDIRECT_URI, safe='')}"
        "&response_type=code"
        "&scope=identify%20guilds.members.read"
    )
    return RedirectResponse(url)

def create_jwt(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

@router.get("/discord/callback")
async def discord_callback(code: str, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": DISCORD_REDIRECT_URI,
            },
        )
    if token_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Error al obtener el token de Discord")
    
    access_token = token_res.json()["access_token"]

    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if user_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Error al obtener el perfil de Discord")
    
    discord_user = user_res.json()
    discord_id = discord_user["id"]
    username = discord_user["username"]
    avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{discord_user.get('avatar')}.png" if discord_user.get("avatar") else None

    async with httpx.AsyncClient() as client:
        member_res = await client.get(
            f"https://discord.com/api/users/@me/guilds/{DISCORD_GUILD_ID}/member",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if member_res.status_code != 200:
        raise HTTPException(
            status_code=403,
            detail="Debes ser miembro de La Guardia de Elune para acceder."
        )

    user = db.query(User).filter(User.discord_id == discord_id).first()
    if not user:
        user = User(
            discord_id=discord_id,
            username=username,
            avatar_url=avatar_url,
            guild_title="Miembro",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_jwt(str(user.id))
    return {
        "access_token": token,
        "token_type": "bearer"}