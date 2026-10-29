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


def _characters(db: Session, user_id) -> list[Character]:
    return (
        db.query(Character)
        .filter(Character.user_id == user_id, Character.deleted_at.is_(None))
        .order_by(Character.is_main.desc(), Character.name)
        .all()
    )


def _character_subject(char: Character) -> str:
    if char.surname and char.surname_allowed:
        return f"{char.name} {char.surname}"
    return char.name


def _character_ref(char: Character) -> dict:
    return {"name": char.name, "realm": char.realm, "game": char.game or "retail"}


def _story_waiting(db: Session, user_id) -> bool:
    return (
        db.query(CharacterStory.id)
        .filter(CharacterStory.author_id == user_id, CharacterStory.status == "pending")
        .first()
        is not None
    )


def _first_published_story(db: Session, user_id) -> CharacterStory | None:
    return (
        db.query(CharacterStory)
        .filter(
            CharacterStory.author_id == user_id,
            CharacterStory.status == "approved",
            CharacterStory.published_at.isnot(None),
        )
        .order_by(CharacterStory.published_at.asc())
        .first()
    )


def _pending_story(db: Session, user_id) -> CharacterStory | None:
    return (
        db.query(CharacterStory)
        .filter(CharacterStory.author_id == user_id, CharacterStory.status == "pending")
        .order_by(CharacterStory.submitted_at.desc())
        .first()
    )


SHEET = {
    "key": PUBLISH_SHEET,
    "title": "Publica la ficha de tu personaje",
    "description": (
        "Escribe una breve biografía de tu personaje y adjunta las imágenes "
        "necesarias para que el Eremita publique tu ficha."
    ),
    "points": 100,
}

STORY = {
    "key": PUBLISH_STORY,
    "title": "Publica tu primer historia",
    "description": (
        "Escribe una de las historias que hayas vivido en Azeroth que sea lo "
        "suficientemente buena como para que el Eremita decida publicarla."
    ),
    "points": 250,
}


def _pay(db: Session, user: User, spec: dict, *, character: Character | None, reason: str, body: str) -> bool:
    try:
        with db.begin_nested():
            tx = points_service.record_uncapped_event(
                db,
                user_id=user.id,
                amount=spec["points"],
                reason=reason,
                category=EventCategory.MISSION,
            )
            db.add(
                UserMission(
                    user_id=user.id,
                    character_id=character.id if character else None,
                    mission_key=spec["key"],
                    point_transaction_id=tx.id,
                )
            )
            db.flush()
    except IntegrityError:
        return False
    notify(
        db,
        user_id=user.id,
        kind="points_mission",
        title=f"+{spec['points']} puntos",
        body=body,
        href="/profile",
    )
    return True


def _award_sheets(db: Session, user: User) -> None:
    paid = {
        character_id
        for (character_id,) in db.query(UserMission.character_id)
        .filter(
            UserMission.user_id == user.id,
            UserMission.mission_key == PUBLISH_SHEET,
            UserMission.character_id.isnot(None),
        )
        .all()
    }
    untied = (
        db.query(UserMission)
        .filter(
            UserMission.user_id == user.id,
            UserMission.mission_key == PUBLISH_SHEET,
            UserMission.character_id.is_(None),
        )
        .first()
    )
    for char in _characters(db, user.id):
        if char.bio_status != "published" or char.id in paid:
            continue
        if untied is not None and untied.character_id is None:
            untied.character_id = char.id
            paid.add(char.id)
            continue
        subject = _character_subject(char)
        _pay(
            db,
            user,
            SHEET,
            character=char,
            reason=f"Misión: {SHEET['title']} — {subject}",
            body=f"{SHEET['title']} · {subject}",
        )


def _award_story(db: Session, user: User) -> None:
    if _first_published_story(db, user.id) is None:
        return
    exists = (
        db.query(UserMission.id)
        .filter(UserMission.user_id == user.id, UserMission.mission_key == PUBLISH_STORY)
        .first()
    )
    if exists:
        return
    _pay(
        db,
        user,
        STORY,
        character=None,
        reason=f"Misión: {STORY['title']}",
        body=STORY["title"],
    )


def grant_ready(db: Session, user: User) -> None:
    """Cobra las misiones ya cumplidas que todavía no tienen puntos. No hace commit."""
    _award_sheets(db, user)
    _award_story(db, user)


def _card(
    spec: dict,
    *,
    status: str,
    completed_at,
    character: Character | None,
    subject: str | None,
) -> dict:
    return {
        "key": spec["key"],
        "title": spec["title"],
        "description": spec["description"],
        "points": spec["points"],
        "status": status,
        "completed_at": completed_at.isoformat() if completed_at else None,
        "character": _character_ref(character) if character else None,
        "subject": subject,
    }


def list_for(db: Session, user: User) -> list[dict]:
    grant_ready(db, user)
    sheet_rows = {
        row.character_id: row
        for row in db.query(UserMission)
        .filter(UserMission.user_id == user.id, UserMission.mission_key == PUBLISH_SHEET)
        .all()
        if row.character_id is not None
    }
    story_row = (
        db.query(UserMission)
        .filter(UserMission.user_id == user.id, UserMission.mission_key == PUBLISH_STORY)
        .first()
    )

    rows: list[dict] = []
    for char in _characters(db, user.id):
        paid = sheet_rows.get(char.id)
        if paid or char.bio_status == "published":
            status = "done"
            completed_at = paid.completed_at if paid else None
        elif char.bio_status == "pending":
            status = "review"
            completed_at = None
        else:
            status = "open"
            completed_at = None
        rows.append(
            _card(
                SHEET,
                status=status,
                completed_at=completed_at,
                character=char,
                subject=_character_subject(char),
            )
        )

    if story_row or _first_published_story(db, user.id) is not None:
        story = _first_published_story(db, user.id)
        rows.append(
            _card(
                STORY,
                status="done",
                completed_at=story_row.completed_at if story_row else (story.published_at if story else None),
                character=None,
                subject=story.title if story else None,
            )
        )
    elif _story_waiting(db, user.id):
        pending = _pending_story(db, user.id)
        rows.append(
            _card(
                STORY,
                status="review",
                completed_at=None,
                character=None,
                subject=pending.title if pending else None,
            )
        )
    else:
        rows.append(
            _card(STORY, status="open", completed_at=None, character=None, subject=None)
        )

    order = {"open": 0, "review": 1, "done": 2}
    rows.sort(key=lambda row: (order[row["status"]], row["subject"] or row["title"]))
    return rows
