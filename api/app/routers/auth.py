import os
import secrets
import time
import unicodedata
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
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

if os.getenv("ENV", "development").lower() == "production":
    if not JWT_SECRET or JWT_SECRET == "dev-secret-change-in-production":
        raise RuntimeError("JWT_SECRET must be set to a strong value in production")

BLIZZARD_CLIENT_ID     = os.getenv("BLIZZARD_CLIENT_ID")
BLIZZARD_CLIENT_SECRET = os.getenv("BLIZZARD_CLIENT_SECRET")
BLIZZARD_REDIRECT_URI  = os.getenv("BLIZZARD_REDIRECT_URI")
BLIZZARD_REGION        = os.getenv("BLIZZARD_REGION", "eu")

router = APIRouter(prefix="/auth", tags=["auth"])
log = logging.getLogger(__name__)

_ROLE_REFRESH_SECONDS = 15 * 60
_role_checked_at: dict[str, float] = {}

# ── Mapeo de roles de Discord → nivel de permiso ─────────────────────────
# El nombre tiene que coincidir entero. Un rol que solo contenga la palabra
# no abre el panel: «Ayudante del líder» sigue siendo miembro.
_ADMIN_ROLES = frozenset({"admin", "lider"})
_OFFICER_ROLES = frozenset({"oficial"})


def _role_key(name: str) -> str:
    folded = unicodedata.normalize("NFKD", name.strip().lower())
    return "".join(ch for ch in folded if not unicodedata.combining(ch))


def _map_role_name(name: str) -> UserRole | None:
    """Devuelve el UserRole si el nombre del rol es exactamente Admin, Líder u Oficial."""
    key = _role_key(name)
    if key in _ADMIN_ROLES:
        return UserRole.ADMIN
    if key in _OFFICER_ROLES:
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


def _highest_role(member_role_ids: list[str], all_roles: dict[str, dict]) -> UserRole:
    member_roles = [all_roles[rid] for rid in member_role_ids if rid in all_roles]
    member_roles.sort(key=lambda role: role.get("position", 0), reverse=True)
    best = UserRole.MEMBER
    for discord_role in member_roles:
        mapped = _map_role_name(discord_role["name"])
        if mapped == UserRole.ADMIN:
            return UserRole.ADMIN
        if mapped == UserRole.OFFICER:
            best = UserRole.OFFICER
    return best


async def _role_from_discord(discord_id: str) -> UserRole | None:
    """Rol actual en el servidor. None si Discord no responde, para no quitar permisos a ciegas."""
    if not DISCORD_BOT_TOKEN or not DISCORD_GUILD_ID or not discord_id:
        return None
    headers = {"Authorization": f"Bot {DISCORD_BOT_TOKEN}"}
    try:
        async with httpx.AsyncClient() as client:
            member_res = await client.get(
                f"https://discord.com/api/v10/guilds/{DISCORD_GUILD_ID}/members/{discord_id}",
                headers=headers,
                timeout=5.0,
            )
            if member_res.status_code == 404:
                return UserRole.MEMBER
            if member_res.status_code != 200:
                return None
            roles_res = await client.get(
                f"https://discord.com/api/v10/guilds/{DISCORD_GUILD_ID}/roles",
                headers=headers,
                timeout=5.0,
            )
        if roles_res.status_code != 200:
            return None
    except Exception:
        return None
    all_roles = {
        role["id"]: role
        for role in roles_res.json()
        if role["id"] != DISCORD_GUILD_ID
    }
    return _highest_role(member_res.json().get("roles") or [], all_roles)


async def refresh_stored_role(user: User, db: Session) -> None:
    """Relee el rol de Discord de un admin u oficial, como mucho cada 15 minutos."""
    if user.role not in (UserRole.ADMIN, UserRole.OFFICER):
        return
    key = str(user.id)
    now = time.monotonic()
    checked = _role_checked_at.get(key)
    if checked is not None and now - checked < _ROLE_REFRESH_SECONDS:
        return
    _role_checked_at[key] = now
    role = await _role_from_discord(user.discord_id)
    if role is None or role == user.role:
        return
    log.info("discord role for %s changed from %s to %s", user.id, user.role.value, role.value)
    user.role = role
    db.commit()


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

DISCORD_STATE_COOKIE = "discord_oauth_state"
BLIZZARD_STATE_COOKIE = "blizzard_oauth_state"
_OAUTH_STATE_SECONDS = 600


def _oauth_redirect(url: str, cookie_name: str, state: str) -> RedirectResponse:
    response = RedirectResponse(url)
    response.set_cookie(
        key=cookie_name,
        value=state,
        max_age=_OAUTH_STATE_SECONDS,
        httponly=True,
        secure=os.getenv("ENV", "development").lower() == "production",
        samesite="lax",
        path="/",
    )
    return response


def _state_ok(saved: str | None, got: str | None) -> bool:
    if not saved or not got or len(saved) != len(got):
        return False
    return secrets.compare_digest(saved, got)


@router.get("/discord/login")
def discord_login():
    state = secrets.token_urlsafe(32)
    url = (
        "https://discord.com/oauth2/authorize"
        f"?client_id={DISCORD_CLIENT_ID}"
        f"&redirect_uri={quote(DISCORD_REDIRECT_URI, safe='')}"
        "&response_type=code"
        "&scope=identify%20guilds.members.read"
        f"&state={quote(state, safe='')}"
    )
    return _oauth_redirect(url, DISCORD_STATE_COOKIE, state)

def create_jwt(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

@router.get("/discord/callback")
async def discord_callback(
    code: str,
    state: str,
    request: Request,
    db: Session = Depends(get_db),
):
    if not _state_ok(request.cookies.get(DISCORD_STATE_COOKIE), state):
        raise HTTPException(400, "El inicio de sesión no es válido. Vuelve a entrar con Discord.")
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
    state: str


@router.get("/blizzard/login")
def blizzard_login():
    """Redirige a Battle.net para leer los personajes (scope wow.profile)."""
    state = secrets.token_urlsafe(32)
    url = (
        "https://oauth.battle.net/authorize"
        f"?client_id={BLIZZARD_CLIENT_ID}"
        f"&redirect_uri={quote(BLIZZARD_REDIRECT_URI, safe='')}"
        "&response_type=code"
        "&scope=wow.profile"
        f"&state={quote(state, safe='')}"
    )
    return _oauth_redirect(url, BLIZZARD_STATE_COOKIE, state)


@router.post("/blizzard/link")
async def blizzard_link(
    data: BlizzardLinkRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recibe el código OAuth2 de Blizzard (enviado por Next.js tras el callback),
    lo intercambia por un access_token y guarda el token + battletag en el usuario.

    ¿Por qué POST y no GET?
    - El código llega primero a Next.js (que tiene la cookie del usuario).
    - Next.js llama aquí con Authorization: Bearer <jwt> + el código en el body.
      Así sabemos qué usuario está vinculando su cuenta.
    """
    if not _state_ok(request.cookies.get(BLIZZARD_STATE_COOKIE), data.state):
        raise HTTPException(400, "La vinculación no es válida. Vuelve a conectar Battle.net.")
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
