import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user
from urllib.parse import quote

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI")
DISCORD_GUILD_ID = os.getenv("DISCORD_GUILD_ID")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

BLIZZARD_CLIENT_ID = os.getenv("BLIZZARD_CLIENT_ID")
BLIZZARD_CLIENT_SECRET = os.getenv("BLIZZARD_CLIENT_SECRET")
BLIZZARD_REDIRECT_URI = os.getenv("BLIZZARD_REDIRECT_URI")
BLIZZARD_REGION = os.getenv("BLIZZARD_REGION", "eu")

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


# ── Battle.net OAuth2 ──────────────────────────────────────────────────────

class BlizzardLinkRequest(BaseModel):
    code: str


@router.get("/blizzard/login")
def blizzard_login():
    """
    Redirige al formulario de autorización de Battle.net.
    El usuario verá la pantalla de login de Blizzard y dará permiso
    para leer sus personajes de WoW (scope: wow.profile).

    ¿Por qué necesitamos `state`?
    Blizzard lo exige como medida de seguridad anti-CSRF.
    En producción generaríamos un token aleatorio por sesión y lo
    verificaríamos en el callback. Para desarrollo usamos un valor fijo.
    """
    import secrets
    state = secrets.token_urlsafe(16)   # ej: "Zf3kQaB9vT2..." — aleatorio pero no verificado aún
    url = (
        "https://oauth.battle.net/authorize"
        f"?client_id={BLIZZARD_CLIENT_ID}"
        f"&redirect_uri={quote(BLIZZARD_REDIRECT_URI, safe='')}"
        "&response_type=code"
        "&scope=wow.profile"
        f"&state={state}"
    )
    return RedirectResponse(url)


@router.post("/blizzard/link")
async def blizzard_link(
    data: BlizzardLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recibe el código OAuth2 de Blizzard (enviado por Next.js tras el callback),
    lo intercambia por un access_token y guarda el token + battletag en el usuario.

    ¿Por qué POST y no GET?
    - El código llega primero a Next.js (que tiene la cookie del usuario).
    - Next.js llama aquí con Authorization: Bearer <jwt> + el código en el body.
    - Así sabemos qué usuario está vinculando su cuenta.
    """
    # 1 — Intercambiar code por access_token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth.battle.net/token",
            data={
                "grant_type": "authorization_code",
                "code": data.code,
                "redirect_uri": BLIZZARD_REDIRECT_URI,
            },
            auth=(BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET),
        )

    if token_res.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Error al obtener token de Battle.net: {token_res.text}"
        )

    token_data = token_res.json()
    access_token = token_data["access_token"]
    expires_in = token_data.get("expires_in", 86400)  # Blizzard tokens duran ~24h

    # 2 — Obtener battletag e ID de Blizzard
    async with httpx.AsyncClient() as client:
        userinfo_res = await client.get(
            "https://oauth.battle.net/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_res.status_code == 200:
        bnet_info = userinfo_res.json()
        blizzard_id = str(bnet_info.get("id", ""))
        battletag = bnet_info.get("battletag")
    else:
        blizzard_id = None
        battletag = None

    # 3 — Guardar en la BD
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    current_user.blizzard_id = blizzard_id
    current_user.blizzard_battletag = battletag
    current_user.blizzard_access_token = access_token
    current_user.blizzard_token_expires_at = expires_at
    db.commit()

    return {"battletag": battletag, "linked": True}
