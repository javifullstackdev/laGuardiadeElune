"""Apellido que puede verse en público. El Eremita puede ocultarlo."""


def visible_surname(char) -> str | None:
    raw = getattr(char, "surname", None)
    if not isinstance(raw, str):
        return None
    text = raw.strip()
    if not text:
        return None
    if getattr(char, "surname_allowed", True) is False:
        return None
    return text
