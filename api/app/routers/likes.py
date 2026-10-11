import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user, require_admin
from app.models.user import User
from app.models.character import Character
from app.models.character_story import ContentLike, CharacterStory
from app.models.post import Post
from app.schemas.story import LikeState, LikeToggle

router = APIRouter(prefix="/likes", tags=["likes"])

ALLOWED = {"post", "story", "character"}
TYPE_LABEL = {"post": "Post / noticia", "story": "Historia", "character": "Ficha"}


def _count(db: Session, target_type: str, target_id):
    return (
        db.query(sa_func.count(ContentLike.id))
        .filter(ContentLike.target_type == target_type, ContentLike.target_id == target_id)
        .scalar()
        or 0
    )


def _require_discord_member(user: User) -> None:
    """Solo cuentas Discord activas (login de la web) pueden dar like."""
    if user.deleted_at is not None:
        raise HTTPException(403, "Cuenta desactivada")
    if not user.discord_id:
        raise HTTPException(403, "Debes iniciar sesión con Discord para dar like")


def _resolve_target(db: Session, target_type: str, target_id) -> dict | None:
    if target_type == "post":
        post = db.query(Post).filter(Post.id == target_id).first()
        if not post:
            return None
        return {
            "title": post.title,
            "subtitle": post.subtitle,
            "href": f"/posts/{post.id}",
            "meta": post.category,
        }
    if target_type == "story":
        row = (
            db.query(CharacterStory, Character)
            .join(Character, Character.id == CharacterStory.character_id)
            .filter(CharacterStory.id == target_id)
            .first()
        )
        if not row:
            return None
        story, char = row
        return {
            "title": story.title,
            "subtitle": f"{char.name}-{char.realm}",
            "href": f"/lore/{story.id}",
            "meta": story.status,
        }
    if target_type == "character":
        char = (
            db.query(Character)
            .filter(Character.id == target_id, Character.deleted_at.is_(None))
            .first()
        )
        if not char:
            return None
        return {
            "title": f"{char.name}{(' ' + char.surname) if char.surname else ''}".strip(),
            "subtitle": char.realm,
            "href": f"/personajes/{char.realm}/{char.name}",
            "meta": char.bio_status,
        }
    return None


def _liker_out(user: User, like: ContentLike, char_count: int) -> dict:
    return {
        "like_id": str(like.id),
        "liked_at": like.created_at.isoformat() if like.created_at else None,
        "user_id": str(user.id),
        "username": user.username,
        "discord_id": user.discord_id,
        "avatar_url": user.avatar_url,
        "role": user.role.value if user.role else None,
        "guild_title": user.guild_title,
        "account_created_at": user.created_at.isoformat() if user.created_at else None,
        "has_blizzard": bool(user.blizzard_id),
        "character_count": char_count,
        "is_deleted": user.deleted_at is not None,
    }


@router.get("/", response_model=LikeState)
def get_like(
    target_type: str = Query(...),
    target_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_optional_user),
):
    if target_type not in ALLOWED:
        raise HTTPException(400, "Tipo no válido")
    liked = False
    if viewer and viewer.deleted_at is None and viewer.discord_id:
        liked = (
            db.query(ContentLike)
            .filter(
                ContentLike.user_id == viewer.id,
                ContentLike.target_type == target_type,
                ContentLike.target_id == target_id,
            )
            .first()
            is not None
        )
    return LikeState(
        target_type=target_type,
        target_id=target_id,
        count=_count(db, target_type, target_id),
        liked=liked,
    )


@router.post("/", response_model=LikeState)
def toggle_like(
    body: LikeToggle,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.target_type not in ALLOWED:
        raise HTTPException(400, "Tipo no válido")
    _require_discord_member(current_user)

    existing = (
        db.query(ContentLike)
        .filter(
            ContentLike.user_id == current_user.id,
            ContentLike.target_type == body.target_type,
            ContentLike.target_id == body.target_id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        liked = False
    else:
        db.add(ContentLike(
            id=uuid.uuid4(),
            user_id=current_user.id,
            target_type=body.target_type,
            target_id=body.target_id,
        ))
        liked = True
    db.commit()
    return LikeState(
        target_type=body.target_type,
        target_id=body.target_id,
        count=_count(db, body.target_type, body.target_id),
        liked=liked,
    )


@router.get("/admin/ranking")
def admin_likes_ranking(
    target_type: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Ranking de contenidos por likes (posts, historias, fichas)."""
    q = (
        db.query(
            ContentLike.target_type,
            ContentLike.target_id,
            sa_func.count(ContentLike.id).label("like_count"),
        )
        .group_by(ContentLike.target_type, ContentLike.target_id)
    )
    if target_type:
        if target_type not in ALLOWED:
            raise HTTPException(400, "Tipo no válido")
        q = q.filter(ContentLike.target_type == target_type)
    rows = q.order_by(sa_func.count(ContentLike.id).desc()).limit(limit).all()

    out = []
    for ttype, tid, count in rows:
        resolved = _resolve_target(db, ttype, tid) or {
            "title": "(contenido eliminado)",
            "subtitle": None,
            "href": None,
            "meta": None,
        }
        out.append({
            "target_type": ttype,
            "target_type_label": TYPE_LABEL.get(ttype, ttype),
            "target_id": str(tid),
            "like_count": count,
            **resolved,
        })
    return out


@router.get("/admin/target/{target_type}/{target_id}")
def admin_likes_for_target(
    target_type: str,
    target_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Quién ha dado like a un contenido concreto."""
    if target_type not in ALLOWED:
        raise HTTPException(400, "Tipo no válido")

    resolved = _resolve_target(db, target_type, target_id)
    likes = (
        db.query(ContentLike, User)
        .join(User, User.id == ContentLike.user_id)
        .filter(
            ContentLike.target_type == target_type,
            ContentLike.target_id == target_id,
        )
        .order_by(ContentLike.created_at.desc())
        .all()
    )
    user_ids = [u.id for _, u in likes]
    char_counts: dict = {}
    if user_ids:
        rows = (
            db.query(Character.user_id, sa_func.count(Character.id))
            .filter(
                Character.user_id.in_(user_ids),
                Character.deleted_at.is_(None),
            )
            .group_by(Character.user_id)
            .all()
        )
        char_counts = {uid: n for uid, n in rows}

    return {
        "target_type": target_type,
        "target_type_label": TYPE_LABEL.get(target_type, target_type),
        "target_id": str(target_id),
        "like_count": len(likes),
        "target": resolved,
        "likers": [
            _liker_out(user, like, char_counts.get(user.id, 0))
            for like, user in likes
        ],
    }


@router.delete("/admin/{like_id}", status_code=204)
def admin_remove_like(
    like_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: quita un like concreto (anti-trampas / limpieza)."""
    like = db.query(ContentLike).filter(ContentLike.id == like_id).first()
    if not like:
        raise HTTPException(404, "Like no encontrado")
    db.delete(like)
    db.commit()
