from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class PostResponse(BaseModel):
    id: UUID
    title: str
    content: str
    category: str | None
    published_at: datetime

    model_config = {
        "from_attributes": True
    }