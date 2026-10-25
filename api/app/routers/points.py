from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import func as sqlfunc, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.character import Character
from app.models.point_transaction import PointTransaction
from app.models.processed_run import ProcessedRun
from app.models.user import User
from app.models.enums import EventCategory
from app.services import blizzard, dungeons, mplus_sync, raiderio
from app.services import points as points_service
from app.services.bio_questions import has_public_sheet
from app.services.blizzard import BlizzardError
from app.services.seasons import current_season

router = APIRouter(prefix="/points", tags=["points"])


class AdminNoteBody(BaseModel):
    reason: str
    amount: int | None = None


def _guild_names(run: ProcessedRun | None) -> list[str]:
    raw = (run.guild_character_names or "").strip() if run else ""
    return [part.strip() for part in raw.split(",") if part.strip()]


def _display_reason(tx: PointTransaction, run: ProcessedRun | None) -> str:
    reason = tx.reason or ""
    names = ", ".join(_guild_names(run))
    if names and names not in reason:
        return f"{reason} — {names}"
    return reason


def serialize_admin_tx(
    tx: PointTransaction,
    user: User | None,
    character: Character | None,
    run: ProcessedRun | None,
) -> dict:
    shown = dungeons.present(run.dungeon, run.dungeon_slug) if run else None
    return {
        "id": str(tx.id),
        "user_id": str(tx.user_id),
        "username": (user.display_name or user.username) if user else "—",
        "discord_username": user.username if user else None,
        "character_name": character.name if character else None,
        "character_realm": character.realm if character else None,
        "amount": tx.amount,
        "counted_amount": points_service.effective_amount(tx),
        "reason": _display_reason(tx, run),
        "admin_note": tx.admin_note,
        "event_category": tx.event_category.value if tx.event_category else None,
        "bucket": points_service.bucket(tx.event_category),
        "weekly_capped": tx.weekly_capped,
        "active": tx.active,
        "occurred_at": (tx.occurred_at or tx.created_at).isoformat(),
        "created_at": tx.created_at.isoformat(),
        "processed_run_id": str(tx.processed_run_id) if tx.processed_run_id else None,
        "guild_characters": _guild_names(run),
        "dungeon": shown["name"] if run else None,
        "dungeon_slug": shown["slug"] if run else None,
        "dungeon_image_url": shown["image_url"] if run else None,
        "mythic_level": run.mythic_level if run else None,
        "timed": run.timed if run else None,
        "completed_at": run.completed_at.isoformat() if run and run.completed_at else None,
    }


def _load_tx(db: Session, tx_id: UUID) -> tuple[PointTransaction, User | None, Character | None, ProcessedRun | None]:
    row = (
        db.query(PointTransaction, User, Character, ProcessedRun)
        .outerjoin(User, User.id == PointTransaction.user_id)
        .outerjoin(Character, Character.id == PointTransaction.character_id)
        .outerjoin(ProcessedRun, ProcessedRun.id == PointTransaction.processed_run_id)
        .filter(PointTransaction.id == tx_id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Asignación no encontrada")
    return row


def _sheet_path(character: Character | None) -> str | None:
    if character is None or not has_public_sheet(character):
        return None
    return f"/personajes/{quote(character.realm, safe='')}/{quote(character.name, safe='')}"


def _public_player(
    tx: PointTransaction,
    user: User | None,
    character: Character | None,
    role: str | None = None,
    spec: str | None = None,
) -> dict:
    counted = points_service.effective_amount(tx)
    return {
        "character_name": character.name if character else None,
        "character_realm": character.realm if character else None,
        "username": (user.display_name or user.username) if user else "—",
        "points": counted,
        "amount": tx.amount,
        "weekly_capped": tx.weekly_capped,
        "role": role,
        "spec": spec,
        "profile_path": _sheet_path(character),
    }


def _season_runs(db: Session, *, limit: int | None, run_id: UUID | None) -> list[ProcessedRun]:
    season = current_season(db)
    run_query = (
        db.query(ProcessedRun)
        .join(PointTransaction, PointTransaction.processed_run_id == ProcessedRun.id)
        .filter(
            PointTransaction.active.is_(True),
            PointTransaction.event_category == EventCategory.MYTHIC_PLUS,
        )
    )
    if season is not None:
        run_query = run_query.filter(PointTransaction.season_id == season.id)
    if run_id is not None:
        run_query = run_query.filter(ProcessedRun.id == run_id)
    run_query = run_query.order_by(ProcessedRun.completed_at.desc()).distinct()
    if limit is not None:
        run_query = run_query.limit(limit)
    return run_query.all()


def _public_board(db: Session, runs: list[ProcessedRun], roles: dict | None = None) -> list[dict]:
    """roles: processed_run_id -> {(nombre, reino): tank|healer|dps}."""
    if not runs:
        return []
    roles = roles or {}
    ids = [run.id for run in runs]
    rows = (
        db.query(PointTransaction, User, Character)
        .outerjoin(User, User.id == PointTransaction.user_id)
        .outerjoin(Character, Character.id == PointTransaction.character_id)
        .filter(
            PointTransaction.processed_run_id.in_(ids),
            PointTransaction.active.is_(True),
            PointTransaction.event_category == EventCategory.MYTHIC_PLUS,
        )
        .all()
    )
    players: dict = {run.id: [] for run in runs}
    for tx, user, character in rows:
        if tx.processed_run_id not in players:
            continue
        role = None
        spec = None
        if character is not None:
            info = roles.get(tx.processed_run_id, {}).get(
                blizzard.character_key(character.name, character.realm)
            )
            if isinstance(info, dict):
                role = info.get("role")
                spec = info.get("spec")
        players[tx.processed_run_id].append(_public_player(tx, user, character, role, spec))

    board = []
    for run in runs:
        shown = dungeons.present(run.dungeon, run.dungeon_slug)
        roster = players[run.id]
        roster.sort(key=lambda player: (-player["points"], player["character_name"] or player["username"]))
        board.append(
            {
                "id": str(run.id),
                "dungeon": shown["name"],
                "dungeon_image_url": shown["image_url"],
                "mythic_level": run.mythic_level,
                "timed": run.timed,
                "completed_at": run.completed_at.isoformat(),
                "guild_characters": _guild_names(run),
                "players": roster,
            }
        )
    return board


async def _roles_for(run: ProcessedRun) -> dict[tuple[str, str], dict]:
    external = run.external_id or ""
    if ":" not in external:
        return {}
    season, raw_id = external.split(":", 1)
    try:
        roster = await raiderio.roster_roles(season, int(raw_id))
    except ValueError:
        return {}
    return {
        blizzard.character_key(item["name"], item["realm"]): {
            "role": item["role"],
            "spec": item.get("spec"),
        }
        for item in roster
    }


@router.get("/mythic-plus")
def public_mythic_plus(
    db: Session = Depends(get_db),
    limit: int = Query(default=40, ge=1, le=80),
):
    """Míticas+ puntuadas de la temporada, para el tablón. Sin datos de administración."""
    return _public_board(db, _season_runs(db, limit=limit, run_id=None))


@router.get("/mythic-plus/{run_id}")
async def public_mythic_plus_detail(run_id: UUID, db: Session = Depends(get_db)):
    """Detalle de una mítica puntuada, con la función de Raider.io y el enlace a la ficha si es pública."""
    runs = _season_runs(db, limit=None, run_id=run_id)
    if not runs:
        raise HTTPException(404, "Mítica no encontrada")
    run = runs[0]
    board = _public_board(db, [run], {run.id: await _roles_for(run)})
    return board[0]


@router.post("/sync-mythic-plus")
async def sync_mythic_plus(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Revisa en Raider.io las M+ recientes de los personajes verificados y puntúa las nuevas."""
    try:
        return await mplus_sync.sync_mythic_plus(db)
    except BlizzardError as exc:
        raise HTTPException(502, str(exc))


@router.get("/admin/history")
def admin_history(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = Query(default=150, le=300),
    q: str = Query(default=""),
):
    """Historial completo de asignaciones, incluidas las anuladas."""
    query = (
        db.query(PointTransaction, User, Character, ProcessedRun)
        .outerjoin(User, User.id == PointTransaction.user_id)
        .outerjoin(Character, Character.id == PointTransaction.character_id)
        .outerjoin(ProcessedRun, ProcessedRun.id == PointTransaction.processed_run_id)
    )
    term = q.strip()
    if term:
        like = f"%{term}%"
        query = query.filter(
            or_(
                User.username.ilike(like),
                User.display_name.ilike(like),
                PointTransaction.reason.ilike(like),
                PointTransaction.admin_note.ilike(like),
                ProcessedRun.dungeon.ilike(like),
                ProcessedRun.guild_character_names.ilike(like),
                Character.name.ilike(like),
            )
        )
    rows = (
        query.order_by(
            sqlfunc.coalesce(PointTransaction.occurred_at, PointTransaction.created_at).desc(),
            PointTransaction.created_at.desc(),
        )
        .limit(limit)
        .all()
    )
    return [serialize_admin_tx(tx, user, character, run) for tx, user, character, run in rows]


COVER_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_COVER_SIZE = 5 * 1024 * 1024


@router.get("/admin/dungeons")
def admin_dungeons(_: User = Depends(require_admin)):
    return dungeons.list_catalog()


@router.post("/admin/dungeons/{slug}/image")
async def admin_dungeon_image(
    slug: str,
    _: User = Depends(require_admin),
    file: UploadFile = File(...),
):
    if slug not in dungeons.BY_SLUG:
        raise HTTPException(404, "Mazmorra no reconocida")
    extension = COVER_EXTENSIONS.get(file.content_type)
    if extension is None:
        raise HTTPException(400, "La imagen debe ser JPEG, PNG o WebP")
    content = await file.read()
    if len(content) > MAX_COVER_SIZE:
        raise HTTPException(400, "La imagen no puede superar 5 MB")
    dungeons.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    for ext in dungeons.IMAGE_EXTS:
        (dungeons.UPLOAD_DIR / f"{slug}.{ext}").unlink(missing_ok=True)
    (dungeons.UPLOAD_DIR / f"{slug}.{extension}").write_bytes(content)
    return dungeons.present(None, slug)


@router.patch("/admin/{tx_id}")
def admin_edit_transaction(
    tx_id: UUID,
    body: AdminNoteBody,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tx, user, character, run = _load_tx(db, tx_id)
    if body.amount is None:
        raise HTTPException(400, "Indica la nueva cantidad")
    try:
        points_service.update_transaction_amount(db, tx, body.amount, body.reason)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    db.commit()
    db.refresh(tx)
    return serialize_admin_tx(tx, user, character, run)


@router.post("/admin/{tx_id}/void")
def admin_void_transaction(
    tx_id: UUID,
    body: AdminNoteBody,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tx, user, character, run = _load_tx(db, tx_id)
    try:
        points_service.void_transaction(db, tx, body.reason)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    db.commit()
    db.refresh(tx)
    return serialize_admin_tx(tx, user, character, run)
