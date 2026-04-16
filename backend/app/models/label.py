from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.comic import Comic


class ComicLabel(Base):
    __tablename__ = "comic_labels"

    comic_id: Mapped[str] = mapped_column(ForeignKey("comics.id", ondelete="CASCADE"), primary_key=True)
    label_id: Mapped[str] = mapped_column(ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)


class Label(Base):
    __tablename__ = "labels"
    __table_args__ = (UniqueConstraint("name", "kind", name="uq_label_name_kind"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100), index=True)
    kind: Mapped[str] = mapped_column(String(20), index=True, default="tag")

    comics: Mapped[list[Comic]] = relationship(
        secondary="comic_labels",
        back_populates="labels",
        lazy="selectin",
    )
