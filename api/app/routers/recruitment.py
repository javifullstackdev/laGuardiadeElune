"""Solicitudes públicas para entrar en la hermandad."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.recruitment import RecruitmentApplication
from app.models.user import User, UserRole
from app.services.notifications import notify

router = APIRouter(prefix="/recruitment", tags=["recruitment"])


class RecruitmentIn(BaseModel):
    first_name: str
    last_name: str
    reason: str
    company: str | None = None


def _clean_name(value: str | None, label: str) -> str:
    text = " ".join((value or "").replace("@", "").split())
    if not text:
        raise HTTPException(400, f"Falta el {label}")
    if len(text) > 60:
        raise HTTPException(400, f"El {label} no puede superar 60 caracteres")
    return text


def _clean_reason(value: str | None) -> str:
    text = "\n".join(" ".join(line.split()) for line in (value or "").splitlines()).strip()
    if len(text) < 8:
        raise HTTPException(400, "Cuéntanos un poco más en la razón")
    if len(text) > 2000:
        raise HTTPException(400, "La razón no puede superar 2000 caracteres")
    return text


def _out(row: RecruitmentApplication) -> dict:
    return {
        "id": str(row.id),
        "first_name": row.first_name,
        "last_name": row.last_name,
        "reason": row.reason,
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.post("/", status_code=201)
def submit_application(body: RecruitmentIn, db: Session = Depends(get_db)):
    if (body.company or "").strip():
        return {"ok": True}
    first = _clean_name(body.first_name, "nombre")
    last = _clean_name(body.last_name, "apellido")
    reason = _clean_reason(body.reason)
    cutoff = datetime.now(timezone.utc) - timedelta(days=1)
    duplicate = (
        db.query(RecruitmentApplication)
        .filter(
            func.lower(RecruitmentApplication.first_name) == first.casefold(),
            func.lower(RecruitmentApplication.last_name) == last.casefold(),
            RecruitmentApplication.created_at >= cutoff,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(409, "Ya hemos recibido una solicitud con ese nombre hace poco")
    row = RecruitmentApplication(first_name=first, last_name=last, reason=reason, status="pending")
    db.add(row)
    db.flush()
    admins = (
        db.query(User)
        .filter(User.role == UserRole.ADMIN, User.deleted_at.is_(None))
        .all()
    )
    for admin in admins:
        notify(
            db,
            user_id=admin.id,
            kind="recruitment",
            title="Nueva solicitud de reclutamiento",
            body=f"{first} {last} quiere unirse a la Guardia.",
            href="/admin/reclutamiento",
        )
    db.commit()
    return {"ok": True}


@router.get("/admin")
def list_applications(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = (
        db.query(RecruitmentApplication)
        .order_by(RecruitmentApplication.created_at.desc())
        .limit(200)
        .all()
    )
    return [_out(row) for row in rows]


@router.post("/admin/{application_id}/read")
def mark_read(
    application_id: UUID,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.query(RecruitmentApplication).filter(RecruitmentApplication.id == application_id).first()
    if row is None:
        raise HTTPException(404, "Solicitud no encontrada")
    row.status = "read"
    db.commit()
    db.refresh(row)
    return _out(row)
