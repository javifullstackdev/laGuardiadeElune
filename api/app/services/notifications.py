"""Avisos del buzón del jugador. Se guardan en la misma transacción que el hecho."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.craft import CraftOrder
from app.models.relation_claim import Notification, RelationClaim


def notify(
    db: Session,
    *,
    user_id,
    kind: str,
    title: str,
    body: str | None = None,
    href: str | None = None,
    claim_id=None,
    craft_order_id=None,
) -> Notification:
    row = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        kind=kind,
        title=title[:255],
        body=body,
        href=href,
        claim_id=claim_id,
        craft_order_id=craft_order_id,
    )
    db.add(row)
    return row


def notify_points(
    db: Session,
    *,
    user_id,
    kind: str,
    counted: int,
    amount: int,
    reason: str,
    href: str | None = None,
) -> None:
    """Solo si el tope semanal ha dejado algún punto contado."""
    if counted <= 0:
        return
    titles = {
        "points_mythic": f"+{counted} puntos de mítica",
        "points_bank": f"+{counted} puntos del banco",
        "points_craft": f"+{counted} puntos de artesanía",
    }
    body = reason
    if counted < amount:
        body = f"{reason}. El tope semanal ha contado {counted} de {amount}."
    notify(
        db,
        user_id=user_id,
        kind=kind,
        title=titles.get(kind, f"+{counted} puntos"),
        body=body,
        href=href,
    )


def mark_passive_read(db: Session, user_id) -> None:
    """Marca como leídos los avisos que no piden una respuesta.

    Siguen sin leer las menciones pendientes y los pedidos que el artesano aún puede coger.
    """
    pending_ids = [
        row[0]
        for row in db.query(RelationClaim.id).filter(RelationClaim.status == "pending").all()
    ]
    open_order_ids = [
        row[0] for row in db.query(CraftOrder.id).filter(CraftOrder.status == "open").all()
    ]
    now = datetime.now(timezone.utc)
    filters = [
        Notification.user_id == user_id,
        Notification.read_at.is_(None),
    ]
    if pending_ids:
        filters.append(
            or_(Notification.claim_id.is_(None), Notification.claim_id.notin_(pending_ids))
        )
    if open_order_ids:
        filters.append(
            ~and_(
                Notification.kind == "craft_offer",
                Notification.craft_order_id.in_(open_order_ids),
            )
        )
    db.query(Notification).filter(*filters).update(
        {Notification.read_at: now},
        synchronize_session=False,
    )
