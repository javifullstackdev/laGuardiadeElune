from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class BioQuestionOption(BaseModel):
    id: str
    label: str


class BioQuestionOut(BaseModel):
    id: str
    prompt: str
    hint: str | None = None
    kind: str
    allow_custom: bool = False
    required: bool = True
    options: list[BioQuestionOption] = []


class BioAnswerView(BaseModel):
    id: str
    prompt: str
    value: str


class BioPublishIn(BaseModel):
    biography: str
    personality: str | None = None
    appearance: str | None = None


class BioRejectIn(BaseModel):
    reason: str | None = None


class BioPendingOut(BaseModel):
    character_id: UUID
    character_name: str
    character_realm: str
    author_username: str
    cover_url: str | None = None
    answers: list[BioAnswerView]
    submitted_at: datetime | None = None
    bio_status: str
    current_biography: str | None = None
    current_personality: str | None = None
    current_appearance: str | None = None
