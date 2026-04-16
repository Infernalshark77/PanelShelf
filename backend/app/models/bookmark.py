from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.dates import utc_now

if TYPE_CHECKING:
    from app.models.comic import Comic


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    comic_id: Mapped[str] = mapped_column(ForeignKey("comics.id", ondelete="CASCADE"), index=True)
    page: Mapped[int] = mapped_column(Integer, index=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utc_now)

    comic: Mapped[Comic] = relationship(back_populates="bookmarks")
