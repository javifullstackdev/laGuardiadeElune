import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models.user import User, UserRole
from app.dependencies import get_current_user
from urllib.parse import quote

DISCORD_CLIENT_ID     = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI  = os.getenv("DISCORD_REDIRECT_URI")
DISCORD_GUILD_ID      = os.getenv("DISCORD_GUILD_ID")
DISCORD_BOT_TOKEN     = os.getenv("DISCORD_TOKEN", "")
JWT_SECRET            = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM         = "HS256"
JWT_EXPIRE_HOURS      = 24

BLIZZARD_CLIENT_ID     = os.getenv("BLIZZARD_CLIENT_ID")
BLIZZARD_CLIENT_SECRET = os.getenv("BLIZZARD_CLIENT_SECRET")
BLIZZARD_REDIRECT_URI  = os.getenv("BLIZZARD_REDIRECT_URI")
BLIZZARD_REGION        = os.getenv("BLIZZARD_REGION", "eu")

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Mapeo de roles de Discord → nivel de permiso ─────────────────────────
# Solo "Lider"/"Líder" → ADMIN, "Oficial" → OFFICER, todo lo demás → MEMBER
_ADMIN_KEYWORDS   = {"lider", "líder"}
_OFFICER_KEYWORDS = {"oficial"}


def _map_role_name(name: str) -> UserRole | None:
    """Devuelve el UserRole si el nombre del rol coincide con un patrón conocido."""
    lower = name.lower()
    if any(k in lower for k in _ADMIN_KEYWORDS):
        return UserRole.ADMIN
    if any(k in lower for k in _OFFICER_KEYWORDS):
        return UserRole.OFFICER
    return None


async def _resolve_discord_role(
    member_role_ids: list[str],
) -> tuple[UserRole, str]:
    """
    Llama a la API de Discord con el bot token para obtener los nombres
    de los roles del servidor y determina el rol más alto del miembro.

    Devuelve (UserRole, guild_title_string).
    Si falla la llamada, devuelve (MEMBER, "Miembro") como fallback seguro.
    """
    if not DISCORD_BOT_TOKEN or not DISCORD_GUILD_ID:
        return UserRole.MEMBER, "Miembro"

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://discord.com/api/v10/guilds/{DISCORD_GUILD_ID}/roles",
                headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"},
                timeout=5.0,
            )
        if res.status_code != 200:
            return UserRole.MEMBER, "Miembro"

        # Construir mapa id → {name, position}
        all_roles: dict[str, dict] = {
            r["id"]: r for r in res.json() if r["id"] != DISCORD_GUILD_ID  # excluir @everyone
        }
    except Exception:
        return UserRole.MEMBER, "Miembro"

    # Filtrar solo los roles que tiene el miembro, ordenar por posición (mayor = más alto)
    member_roles = [
        all_roles[rid] for rid in member_role_ids if rid in all_roles
    ]
    member_roles.sort(key=lambda r: r.get("position", 0), reverse=True)

    # Determinar nivel de permiso basado en el rol más alto reconocido
    best_role   = UserRole.MEMBER
    best_title  = "Miembro"

    for discord_role in member_roles:
        mapped = _map_role_name(discord_role["name"])
        if mapped == UserRole.ADMIN:
            return UserRole.ADMIN, discord_role["name"]
        if mapped == UserRole.OFFICER and best_role != UserRole.ADMIN:
            best_role  = UserRole.OFFICER
            best_title = discord_role["name"]

    # Si no se reconoció ningún rol especial, devolver el nombre del rol más alto como título
    if best_role == UserRole.MEMBER and member_roles:
        best_title = member_roles[0]["name"]

    return best_role, best_title


def _nick_from_member(member: dict, fallback: str = "") -> str:
    """Apodo del servidor, o username de Discord si no tiene apodo."""
    nick = (member.get("nick") or "").strip()
    if nick:
        return nick
    user = member.get("user") or {}
    return (user.get("username") or fallback).strip() or fallback


async def fetch_guild_nick(discord_id: str) -> str | None:
    """Apodo de un miembro via Bot token. None si Discord no responde."""
    if not DISCORD_BOT_TOKEN or not DISCORD_GUILD_ID:
        return None
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://discord.com/api/v10/guilds/{DISCORD_GUILD_ID}/members/{discord_id}",
                headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"},
                timeout=5.0,
            )
        if res.status_code != 200:
            return None
        return _nick_from_member(res.json())
    except Exception:
        return None


async def fetch_guild_nicks() -> dict[str, str]:
    """Mapa discord_id → apodo del servidor (hasta 1000 miembros)."""
    if not DISCORD_BOT_TOKEN or not DISCORD_GUILD_ID:
        return {}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://discord.com/api/v10/guilds/{DISCORD_GUILD_ID}/members",
                headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"},
                params={"limit": 1000},
                timeout=8.0,
            )
        if res.status_code != 200:
            return {}
        result: dict[str, str] = {}
        for member in res.json():
            user = member.get("user") or {}
            uid = user.get("id")
            if not uid:
                continue
            result[uid] = _nick_from_member(member, user.get("username") or "")
        return result
    except Exception:
        return {}

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
    # ── 1. Intercambiar code por access_token ─────────────────────────────
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

    # ── 2. Perfil básico del usuario ──────────────────────────────────────
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if user_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Error al obtener el perfil de Discord")

    discord_user = user_res.json()
    discord_id   = discord_user["id"]
    avatar_hash  = discord_user.get("avatar")
    avatar_url   = (
        f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png"
        if avatar_hash else None
    )

    # ── 3. Verificar pertenencia al servidor y obtener roles ──────────────
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

    member_data     = member_res.json()
    member_role_ids = member_data.get("roles", [])
    # Apodo del servidor (el que pone el líder). Si no hay, username de Discord.
    username = (member_data.get("nick") or "").strip() or discord_user["username"]

    # ── 4. Resolver rol y título a partir de los roles de Discord ─────────
    new_role, role_title = await _resolve_discord_role(member_role_ids)

    # ── 5. Crear o actualizar usuario ─────────────────────────────────────
    user = db.query(User).filter(User.discord_id == discord_id).first()
    if user:
        # En cada login solo sincronizamos datos que vienen de Discord:
        # avatar, username y rol. guild_title es un campo independiente
        # que gestiona el admin y no debe sobreescribirse aquí.
        user.username   = username
        user.avatar_url = avatar_url
        user.role       = new_role
    else:
        # Primera vez: asignamos guild_title basándonos en el rol
        # como valor inicial razonable (el admin puede cambiarlo después)
        user = User(
            discord_id  = discord_id,
            username    = username,
            avatar_url  = avatar_url,
            role        = new_role,
            guild_title = role_title,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    token = create_jwt(str(user.id))
    return {"access_token": token, "token_type": "bearer"}

@router.delete("/blizzard/unlink", status_code=204)
def blizzard_unlink(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Desvincula la cuenta de Battle.net del usuario.
    Los personajes se mantienen pero pierden is_verified=True —
    ya no podemos confirmar que siguen perteneciendo a este usuario.
    """
    from app.models.character import Character

    # Limpiar token de Blizzard
    current_user.blizzard_id = None
    current_user.blizzard_battletag = None
    current_user.blizzard_access_token = None
    current_user.blizzard_token_expires_at = None

    # Desmarcar personajes verificados
    db.query(Character).filter(
        Character.user_id == current_user.id,
        Character.is_verified == True,
    ).update({"is_verified": False})

    db.commit()




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
