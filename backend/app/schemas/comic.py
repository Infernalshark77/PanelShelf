from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.bookmark import BookmarkResponse


class ComicSummary(BaseModel):
    id: str
    title: str
    series: str | None = None
    volume: str | None = None
    issue_number: str | None = None
    author: str | None = None
    publisher: str | None = None
    summary: str | None = None
    source_type: str
    original_filename: str
    page_count: int
    favorite: bool
    read_status: str
    current_page: int
    progress_percent: float
    is_completed: bool
    default_reading_direction: str
    added_at: datetime
    updated_at: datetime
    last_read_at: datetime | None = None
    tags: list[str]
    genres: list[str]
    thumbnail_url: str
    cover_url: str
    resume_url: str


class ComicDetail(ComicSummary):
    bookmarks: list[BookmarkResponse]


class ComicUpdate(BaseModel):
    title: str | None = None
    series: str | None = None
    volume: str | None = None
    issue_number: str | None = None
    author: str | None = None
    publisher: str | None = None
    summary: str | None = None
    favorite: bool | None = None
    read_status: str | None = None
    default_reading_direction: str | None = None
    tags: list[str] | None = None
    genres: list[str] | None = None


class ProgressUpdate(BaseModel):
    current_page: int = Field(ge=1)


class ComicListResponse(BaseModel):
    items: list[ComicSummary]
    total: int
    page: int
    per_page: int
    stats: dict[str, int]
