from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class PostCreate(BaseModel):
    title: str
    content: str
    category: str | None = None
    subtitle: str | None = None
    cover_url: str | None = None

class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    subtitle: str | None = None
    cover_url: str | None = None

class PostResponse(BaseModel):
    id: UUID
    title: str
    content: str
    category: str | None
    published_at: datetime
    subtitle: str | None = None
    cover_url: str | None = None

    model_config = {
        "from_attributes": True
    }
