from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.dates import utc_now

if TYPE_CHECKING:
    from app.models.bookmark import Bookmark
    from app.models.label import Label


class Comic(Base):
    __tablename__ = "comics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String(255), index=True)
    series: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    volume: Mapped[str | None] = mapped_column(String(50), nullable=True)
    issue_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    publisher: Mapped[str | None] = mapped_column(String(255), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    source_type: Mapped[str] = mapped_column(String(20), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    original_path: Mapped[str] = mapped_column(Text)
    manifest_path: Mapped[str] = mapped_column(Text)
    cover_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    page_count: Mapped[int] = mapped_column(Integer, default=0)
    favorite: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    read_status: Mapped[str] = mapped_column(String(20), default="unread", index=True)
    current_page: Mapped[int] = mapped_column(Integer, default=1)
    progress_percent: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    default_reading_direction: Mapped[str] = mapped_column(String(3), default="ltr")
    metadata_source: Mapped[str] = mapped_column(String(20), default="filename")

    added_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    last_read_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    labels: Mapped[list[Label]] = relationship(
        secondary="comic_labels",
        back_populates="comics",
        lazy="selectin",
    )
    bookmarks: Mapped[list[Bookmark]] = relationship(
        back_populates="comic",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="Bookmark.page",
    )
