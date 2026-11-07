"""Aviso por mensaje directo de Discord cuando el buzón guarda una notificación."""

from __future__ import annotations

import logging
import os
import threading

import httpx
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.models.user import User
from app.urls import public_base_url

logger = logging.getLogger(__name__)


def _site_origin() -> str:
    explicit = os.getenv("SITE_URL", "").strip().rstrip("/")
    if explicit:
        return explicit
    public = public_base_url()
    if public.endswith(":8000"):
        return "http://localhost:3000"
    return public


def _text() -> str:
    return f"Has recibido un mensaje en tu buzón\n{_site_origin()}/profile"


def deliver_discord_dms(items: list[dict]) -> None:
    token = os.getenv("DISCORD_TOKEN", "").strip()
    if not token or not items:
        return
    headers = {"Authorization": f"Bot {token}", "Content-Type": "application/json"}
    try:
        seen: set[str] = set()
        with httpx.Client(timeout=8.0) as client:
            for item in items:
                discord_id = item["discord_id"]
                if discord_id in seen:
                    continue
                seen.add(discord_id)
                _send_one(client, headers, discord_id)
    except Exception:
        logger.exception("No se pudieron enviar los avisos de Discord")


def _send_one(client: httpx.Client, headers: dict, discord_id: str) -> None:
    try:
        opened = client.post(
            "https://discord.com/api/v10/users/@me/channels",
            headers=headers,
            json={"recipient_id": discord_id},
        )
        if opened.status_code >= 400:
            logger.info("Discord no abrió el mensaje directo (%s)", opened.status_code)
            return
        channel_id = opened.json().get("id")
        if not channel_id:
            return
        sent = client.post(
            f"https://discord.com/api/v10/channels/{channel_id}/messages",
            headers=headers,
            json={"content": _text()},
        )
        if sent.status_code >= 400:
            logger.info("Discord no entregó el aviso (%s)", sent.status_code)
    except Exception:
        logger.exception("Fallo al avisar por Discord")


def queue_discord_dm(db: Session, *, user_id) -> None:
    """Encola el aviso y lo manda cuando la transacción se confirma."""
    if not os.getenv("DISCORD_TOKEN", "").strip():
        return
    user = db.get(User, user_id)
    if user is None or user.deleted_at is not None or not user.discord_id:
        return
    db.info.setdefault("discord_dm_queue", []).append(
        {"discord_id": user.discord_id}
    )
    if db.info.get("discord_dm_listening"):
        return
    db.info["discord_dm_listening"] = True

    def _after_commit(session: Session) -> None:
        session.info["discord_dm_listening"] = False
        pending = session.info.pop("discord_dm_queue", [])
        if pending:
            threading.Thread(target=deliver_discord_dms, args=(pending,), daemon=True).start()

    def _after_rollback(session: Session) -> None:
        session.info["discord_dm_listening"] = False
        session.info.pop("discord_dm_queue", None)

    event.listen(db, "after_commit", _after_commit, once=True)
    event.listen(db, "after_rollback", _after_rollback, once=True)
