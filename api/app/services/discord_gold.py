"""Aviso en #guardianocturna cuando se confirma un ingreso de la misión."""

from __future__ import annotations

import logging
import os
import threading

import httpx
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.services.goal_card import format_money

logger = logging.getLogger(__name__)

CHANNEL_NAME = "guardianocturna"
_cached_channel_id: str | None = None


def goal_deposit_message(name: str, deposited: int, counted: int, goal: int) -> str:
    who = " ".join((name or "Alguien").replace("@everyone", "").replace("@here", "").split()) or "Alguien"
    paid = format_money(deposited)
    if goal > 0 and counted >= goal:
        tail = "¡Objetivo cumplido!"
    else:
        left = format_money(max(0, goal - counted))
        verb = "Queda" if "," not in left and left.startswith("1 ") else "Quedan"
        tail = f"{verb} {left} para cumplir el objetivo"
    return f"¡{who} ha ingresado {paid}! {tail}"


def queue_goal_deposit(db: Session, text: str) -> None:
    """Encola el mensaje y lo manda cuando la confirmación queda guardada."""
    if not os.getenv("DISCORD_TOKEN", "").strip() or not text.strip():
        return
    db.info.setdefault("discord_gold_queue", []).append(text)
    if db.info.get("discord_gold_listening"):
        return
    db.info["discord_gold_listening"] = True

    def _after_commit(session: Session) -> None:
        session.info["discord_gold_listening"] = False
        pending = session.info.pop("discord_gold_queue", [])
        if pending:
            threading.Thread(target=deliver_goal_messages, args=(pending,), daemon=True).start()

    def _after_rollback(session: Session) -> None:
        session.info["discord_gold_listening"] = False
        session.info.pop("discord_gold_queue", None)

    event.listen(db, "after_commit", _after_commit, once=True)
    event.listen(db, "after_rollback", _after_rollback, once=True)


def deliver_goal_messages(messages: list[str]) -> None:
    token = os.getenv("DISCORD_TOKEN", "").strip()
    if not token or not messages:
        return
    headers = {"Authorization": f"Bot {token}", "Content-Type": "application/json"}
    try:
        with httpx.Client(timeout=8.0) as client:
            channel_id = _channel_id(client, headers)
            if not channel_id:
                logger.info("No está el canal #%s", CHANNEL_NAME)
                return
            for text in messages:
                sent = client.post(
                    f"https://discord.com/api/v10/channels/{channel_id}/messages",
                    headers=headers,
                    json={"content": text[:2000]},
                )
                if sent.status_code >= 400:
                    logger.info("Discord no publicó el ingreso (%s)", sent.status_code)
    except Exception:
        logger.exception("No se pudo avisar del ingreso en Discord")


def _channel_id(client: httpx.Client, headers: dict) -> str | None:
    global _cached_channel_id
    explicit = os.getenv("DISCORD_GOLD_CHANNEL_ID", "").strip()
    if explicit:
        return explicit
    if _cached_channel_id:
        return _cached_channel_id
    guild_id = os.getenv("DISCORD_GUILD_ID", "").strip()
    if not guild_id:
        return None
    listed = client.get(
        f"https://discord.com/api/v10/guilds/{guild_id}/channels",
        headers=headers,
    )
    if listed.status_code >= 400:
        logger.info("Discord no listó los canales (%s)", listed.status_code)
        return None
    for channel in listed.json():
        if channel.get("name") == CHANNEL_NAME:
            _cached_channel_id = str(channel.get("id") or "")
            return _cached_channel_id or None
    return None
