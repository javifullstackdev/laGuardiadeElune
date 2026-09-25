from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class StoryMentionIn(BaseModel):
    to_name: str
    to_realm: str
    relation_type: str
    met_at: str | None = None
    note: str | None = None


class StorySubmit(BaseModel):
    name: str
    realm: str
    title: str | None = None
    mentions: list[StoryMentionIn] = []


class StoryApprove(BaseModel):
    override: bool = False
    reason: str | None = None


class StoryRelationOut(BaseModel):
    name: str
    realm: str
    relation_type: str
    met_at: str | None = None
    note: str | None = None
    status: str
    owner_username: str


class ClaimInboxItem(BaseModel):
    id: UUID
    story_id: UUID
    story_title: str
    from_name: str
    from_realm: str
    author_username: str
    relation_type: str
    met_at: str | None = None
    note: str | None = None
    status: str


class StoryReject(BaseModel):
    reason: str | None = None


class StoryPublic(BaseModel):
    id: UUID
    title: str
    status: str
    biography: str | None
    personality: str | None
    appearance: str | None
    published_at: datetime | None
    character_name: str
    character_realm: str
    character_class: str | None = None
    cover_url: str | None = None
    author_username: str
    like_count: int = 0
    relations: list[StoryRelationOut] = []

    model_config = {"from_attributes": True}


class StoryMine(BaseModel):
    id: UUID
    status: str
    title: str
    rejection_reason: str | None = None
    submitted_at: datetime
    published_at: datetime | None = None
    awaiting_relations: bool = False
    cover_url: str | None = None
    biography: str | None = None
    personality: str | None = None
    appearance: str | None = None


class StoryPending(BaseModel):
    id: UUID
    title: str
    biography: str | None
    personality: str | None
    appearance: str | None
    submitted_at: datetime
    character_name: str
    character_realm: str
    author_username: str
    relations: list[StoryRelationOut] = []
    awaiting_relations: bool = False
    cover_url: str | None = None


class LikeState(BaseModel):
    target_type: str
    target_id: UUID
    count: int
    liked: bool


class LikeToggle(BaseModel):
    target_type: str
    target_id: UUID
