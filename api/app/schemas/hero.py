from uuid import UUID
from pydantic import BaseModel


class HeroSlideCreate(BaseModel):
    kind: str
    story_id: UUID | None = None
    character_id: UUID | None = None
    character_name: str | None = None
    character_realm: str | None = None
    kicker: str | None = None
    title: str | None = None
    subtitle: str | None = None
    image_url: str | None = None
    href: str | None = None
    cta_label: str | None = None
    focus_x: int | None = None
    focus_y: int | None = None
    is_active: bool = True


class HeroSlideUpdate(BaseModel):
    kicker: str | None = None
    title: str | None = None
    subtitle: str | None = None
    image_url: str | None = None
    href: str | None = None
    cta_label: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    focus_x: int | None = None
    focus_y: int | None = None


class HeroReorder(BaseModel):
    ids: list[UUID]


class HeroSlidePublic(BaseModel):
    id: UUID
    kind: str
    src: str
    kicker: str
    title: str
    subtitle: str
    href: str
    cta: str
    focus_x: int = 50
    focus_y: int = 28


class HeroSlideAdmin(HeroSlidePublic):
    story_id: UUID | None = None
    character_id: UUID | None = None
    image_url: str | None = None
    is_active: bool
    sort_order: int
