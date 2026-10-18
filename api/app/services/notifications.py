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

    Siguen sin leer las menciones pendientes, la oferta mientras el pedido está libre,
    el aviso del artesano hasta que lo marca fabricado y el del solicitante hasta que lo recoge.
    """
    pending_ids = [
        row[0]
        for row in db.query(RelationClaim.id).filter(RelationClaim.status == "pending").all()
    ]
    waiting: dict[str, list] = {"open": [], "claimed": [], "completed": []}
    for order_id, status in db.query(CraftOrder.id, CraftOrder.status).filter(
        CraftOrder.status.in_(("open", "claimed", "completed"))
    ):
        waiting[status].append(order_id)
    now = datetime.now(timezone.utc)
    filters = [
        Notification.user_id == user_id,
        Notification.read_at.is_(None),
    ]
    if pending_ids:
        filters.append(
            or_(Notification.claim_id.is_(None), Notification.claim_id.notin_(pending_ids))
        )
    still_open = []
    if waiting["open"]:
        still_open.append(
            and_(Notification.kind == "craft_offer", Notification.craft_order_id.in_(waiting["open"]))
        )
    if waiting["claimed"]:
        still_open.append(
            and_(
                Notification.kind == "craft_accepted",
                Notification.craft_order_id.in_(waiting["claimed"]),
            )
        )
    if waiting["completed"]:
        still_open.append(
            and_(
                Notification.kind == "craft_ready",
                Notification.craft_order_id.in_(waiting["completed"]),
            )
        )
    if still_open:
        filters.append(~or_(*still_open))
    db.query(Notification).filter(*filters).update(
        {Notification.read_at: now},
        synchronize_session=False,
    )
