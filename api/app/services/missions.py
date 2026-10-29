"""Misiones del jugador. Los puntos no dependen del itinerario ni del tope semanal."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.character import Character
from app.models.character_story import CharacterStory
from app.models.enums import EventCategory
from app.models.user import User
from app.models.user_mission import UserMission
from app.services import points as points_service
from app.services.notifications import notify

PUBLISH_SHEET = "publish_character_sheet"
PUBLISH_STORY = "publish_first_story"


def _sheet_done(db: Session, user_id) -> bool:
    return (
        db.query(Character.id)
        .filter(
            Character.user_id == user_id,
            Character.deleted_at.is_(None),
            Character.bio_status == "published",
        )
        .first()
        is not None
    )


def _sheet_waiting(db: Session, user_id) -> bool:
    return (
        db.query(Character.id)
        .filter(
            Character.user_id == user_id,
            Character.deleted_at.is_(None),
            Character.bio_status == "pending",
        )
        .first()
        is not None
    )


def _story_done(db: Session, user_id) -> bool:
    return (
        db.query(CharacterStory.id)
        .filter(
            CharacterStory.author_id == user_id,
            CharacterStory.status == "approved",
            CharacterStory.published_at.isnot(None),
        )
        .first()
        is not None
    )


def _story_waiting(db: Session, user_id) -> bool:
    return (
        db.query(CharacterStory.id)
        .filter(CharacterStory.author_id == user_id, CharacterStory.status == "pending")
        .first()
        is not None
    )


CATALOG = (
    {
        "key": PUBLISH_SHEET,
        "title": "Publica la ficha de tu personaje",
        "description": (
            "Escribe una breve biografía de tu personaje y adjunta las imágenes "
            "necesarias para que el Eremita publique tu ficha."
        ),
        "points": 100,
        "done": _sheet_done,
        "waiting": _sheet_waiting,
    },
    {
        "key": PUBLISH_STORY,
        "title": "Publica tu primer historia",
        "description": (
            "Escribe una de las historias que hayas vivido en Azeroth que sea lo "
            "suficientemente buena como para que el Eremita decida publicarla."
        ),
        "points": 250,
        "done": _story_done,
        "waiting": _story_waiting,
    },
)


def _status(spec: dict, user_id, done: bool, db: Session) -> str:
    if done:
        return "done"
    if spec["waiting"](db, user_id):
        return "review"
    return "open"


def _award(db: Session, user: User, spec: dict) -> None:
    if not spec["done"](db, user.id):
        return
    exists = (
        db.query(UserMission.id)
        .filter(UserMission.user_id == user.id, UserMission.mission_key == spec["key"])
        .first()
    )
    if exists:
        return
    try:
        with db.begin_nested():
            tx = points_service.record_uncapped_event(
                db,
                user_id=user.id,
                amount=spec["points"],
                reason=f"Misión: {spec['title']}",
                category=EventCategory.MISSION,
            )
            db.add(
                UserMission(
                    user_id=user.id,
                    mission_key=spec["key"],
                    point_transaction_id=tx.id,
                )
            )
            db.flush()
    except IntegrityError:
        return
    notify(
        db,
        user_id=user.id,
        kind="points_mission",
        title=f"+{spec['points']} puntos",
        body=spec["title"],
        href="/profile",
    )


def grant_ready(db: Session, user: User) -> None:
    """Cobra las misiones ya cumplidas que todavía no tienen puntos. No hace commit."""
    for spec in CATALOG:
        _award(db, user, spec)


def list_for(db: Session, user: User) -> list[dict]:
    grant_ready(db, user)
    done_keys = {
        key
        for (key,) in db.query(UserMission.mission_key).filter(UserMission.user_id == user.id).all()
    }
    rows = []
    for spec in CATALOG:
        done = spec["key"] in done_keys
        rows.append(
            {
                "key": spec["key"],
                "title": spec["title"],
                "description": spec["description"],
                "points": spec["points"],
                "status": _status(spec, user.id, done, db),
            }
        )
    order = {"open": 0, "review": 1, "done": 2}
    rows.sort(key=lambda row: order[row["status"]])
    return rows
