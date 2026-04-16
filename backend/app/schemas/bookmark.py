from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class BookmarkCreate(BaseModel):
    page: int = Field(ge=1)
    note: str | None = None


class BookmarkResponse(BaseModel):
    id: str
    page: int
    note: str | None = None
    created_at: datetime
