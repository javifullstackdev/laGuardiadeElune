"""Semana de puntos = semana de WoW EU: de miércoles 04:00 UTC a miércoles 04:00 UTC."""

from datetime import datetime, time, timedelta, timezone

RESET_WEEKDAY = 2  # miércoles
RESET_TIME = time(4, 0, tzinfo=timezone.utc)


def week_start(at: datetime) -> datetime:
    """Inicio (en UTC) de la semana a la que pertenece `at`."""
    if at.tzinfo is None:
        raise ValueError("week_start necesita una fecha con zona horaria")
    utc = at.astimezone(timezone.utc)
    days_back = (utc.weekday() - RESET_WEEKDAY) % 7
    start = datetime.combine(utc.date() - timedelta(days=days_back), RESET_TIME)
    if start > utc:
        start -= timedelta(days=7)
    return start


def week_end(at: datetime) -> datetime:
    return week_start(at) + timedelta(days=7)
