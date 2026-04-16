from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.bookmark import Bookmark
from app.models.comic import Comic
from app.models.label import Label
from app.utils.dates import utc_now

VALID_READ_STATUSES = {"unread", "in_progress", "read"}
VALID_SORTS = {"recent", "title", "series", "progress"}


def get_or_404(db: Session, comic_id: str) -> Comic:
    comic = (
        db.query(Comic)
        .options(selectinload(Comic.labels), selectinload(Comic.bookmarks))
        .filter(Comic.id == comic_id)
        .first()
    )
    if not comic:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comic not found")
    return comic


def split_labels(labels: Iterable[Label]) -> tuple[list[str], list[str]]:
    tags: list[str] = []
    genres: list[str] = []
    for label in labels:
        if label.kind == "genre":
            genres.append(label.name)
        else:
            tags.append(label.name)
    return sorted(tags, key=str.lower), sorted(genres, key=str.lower)


def serialize_bookmark(bookmark: Bookmark) -> dict[str, Any]:
    return {
        "id": bookmark.id,
        "page": bookmark.page,
        "note": bookmark.note,
        "created_at": bookmark.created_at,
    }


def serialize_comic_summary(comic: Comic) -> dict[str, Any]:
    tags, genres = split_labels(comic.labels)
    return {
        "id": comic.id,
        "title": comic.title,
        "series": comic.series,
        "volume": comic.volume,
        "issue_number": comic.issue_number,
        "author": comic.author,
        "publisher": comic.publisher,
        "summary": comic.summary,
        "source_type": comic.source_type,
        "original_filename": comic.original_filename,
        "page_count": comic.page_count,
        "favorite": comic.favorite,
        "read_status": comic.read_status,
        "current_page": comic.current_page,
        "progress_percent": comic.progress_percent,
        "is_completed": comic.is_completed,
        "default_reading_direction": comic.default_reading_direction,
        "added_at": comic.added_at,
        "updated_at": comic.updated_at,
        "last_read_at": comic.last_read_at,
        "tags": tags,
        "genres": genres,
        "thumbnail_url": f"/api/comics/{comic.id}/thumbnail",
        "cover_url": f"/api/comics/{comic.id}/thumbnail",
        "resume_url": f"/reader/{comic.id}",
    }


def serialize_comic_detail(comic: Comic) -> dict[str, Any]:
    payload = serialize_comic_summary(comic)
    payload["bookmarks"] = [serialize_bookmark(item) for item in comic.bookmarks]
    return payload


def normalize_read_status(status_value: str | None) -> str | None:
    if status_value is None:
        return None
    if status_value not in VALID_READ_STATUSES:
        raise ValueError(f"Invalid read status: {status_value}")
    return status_value


def update_progress(comic: Comic, current_page: int) -> Comic:
    page = max(1, min(current_page, max(comic.page_count, 1)))
    comic.current_page = page
    comic.progress_percent = round((page / max(comic.page_count, 1)) * 100, 2)
    comic.last_read_at = utc_now()

    if page <= 1:
        comic.read_status = "unread"
        comic.is_completed = False
    elif page >= comic.page_count:
        comic.read_status = "read"
        comic.is_completed = True
    else:
        comic.read_status = "in_progress"
        comic.is_completed = False

    return comic


def replace_labels(db: Session, comic: Comic, tags: list[str], genres: list[str]) -> None:
    normalized: list[tuple[str, str]] = []
    for value in tags:
        cleaned = value.strip()
        if cleaned:
            normalized.append((cleaned, "tag"))
    for value in genres:
        cleaned = value.strip()
        if cleaned:
            normalized.append((cleaned, "genre"))

    comic.labels.clear()
    seen: set[tuple[str, str]] = set()
    for name, kind in normalized:
        key = (name.lower(), kind)
        if key in seen:
            continue
        seen.add(key)
        label = db.query(Label).filter(func.lower(Label.name) == name.lower(), Label.kind == kind).first()
        if not label:
            label = Label(name=name, kind=kind)
            db.add(label)
            db.flush()
        comic.labels.append(label)


def search_comics(
    db: Session,
    *,
    q: str | None,
    favorite: bool | None,
    read_status: str | None,
    tag: str | None,
    genre: str | None,
    sort: str,
    page: int,
    per_page: int,
) -> tuple[list[Comic], int]:
    query = db.query(Comic).options(selectinload(Comic.labels), selectinload(Comic.bookmarks))

    if q:
        pattern = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Comic.title).like(pattern),
                func.lower(Comic.series).like(pattern),
                func.lower(Comic.author).like(pattern),
                func.lower(Comic.publisher).like(pattern),
            )
        )

    if favorite is not None:
        query = query.filter(Comic.favorite == favorite)

    if read_status:
        query = query.filter(Comic.read_status == read_status)

    if tag:
        query = query.filter(Comic.labels.any((Label.kind == "tag") & (func.lower(Label.name) == tag.lower())))

    if genre:
        query = query.filter(Comic.labels.any((Label.kind == "genre") & (func.lower(Label.name) == genre.lower())))

    query = query.distinct()

    total = query.count()

    if sort == "title":
        query = query.order_by(func.lower(Comic.title).asc(), Comic.added_at.desc())
    elif sort == "series":
        query = query.order_by(func.lower(Comic.series).asc(), func.lower(Comic.title).asc())
    elif sort == "progress":
        query = query.order_by(Comic.progress_percent.desc(), Comic.last_read_at.desc(), Comic.added_at.desc())
    else:
        query = query.order_by(Comic.added_at.desc())

    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return items, total


def library_stats(db: Session) -> dict[str, int]:
    total = db.query(func.count(Comic.id)).scalar() or 0
    favorites = db.query(func.count(Comic.id)).filter(Comic.favorite.is_(True)).scalar() or 0
    unread = db.query(func.count(Comic.id)).filter(Comic.read_status == "unread").scalar() or 0
    in_progress = db.query(func.count(Comic.id)).filter(Comic.read_status == "in_progress").scalar() or 0
    read = db.query(func.count(Comic.id)).filter(Comic.read_status == "read").scalar() or 0
    return {
        "total": int(total),
        "favorites": int(favorites),
        "unread": int(unread),
        "in_progress": int(in_progress),
        "read": int(read),
    }
