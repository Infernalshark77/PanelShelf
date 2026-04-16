from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import AuthDep, SessionDep
from app.models.bookmark import Bookmark
from app.schemas.bookmark import BookmarkCreate, BookmarkResponse
from app.schemas.comic import ComicDetail, ComicListResponse, ComicSummary, ComicUpdate, ProgressUpdate
from app.services.comics import (
    VALID_READ_STATUSES,
    library_stats,
    normalize_read_status,
    replace_labels,
    search_comics,
    serialize_comic_detail,
    serialize_comic_summary,
    update_progress,
    get_or_404,
)
from app.services.storage import (
    ImportErrorHTTP,
    delete_comic_files,
    ensure_page_cached,
    ensure_thumbnail,
    import_image_folder,
    import_single_file,
    set_manual_cover,
)

router = APIRouter(prefix="/comics", tags=["comics"])


@router.get("", response_model=ComicListResponse)
def list_comics(
    db: SessionDep,
    _auth: AuthDep,
    q: str | None = Query(default=None),
    favorite: bool | None = Query(default=None),
    read_status: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    genre: str | None = Query(default=None),
    sort: str = Query(default="recent"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=24, ge=1, le=200),
) -> ComicListResponse:
    if read_status and read_status not in VALID_READ_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid read_status filter")
    if sort not in {"recent", "title", "series", "progress"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sort value")

    items, total = search_comics(
        db,
        q=q,
        favorite=favorite,
        read_status=read_status,
        tag=tag,
        genre=genre,
        sort=sort,
        page=page,
        per_page=per_page,
    )
    return ComicListResponse(
        items=[ComicSummary.model_validate(serialize_comic_summary(item)) for item in items],
        total=total,
        page=page,
        per_page=per_page,
        stats=library_stats(db),
    )


@router.post("/upload", response_model=ComicDetail, status_code=status.HTTP_201_CREATED)
def upload_comic(db: SessionDep, _auth: AuthDep, file: UploadFile = File(...)) -> ComicDetail:
    try:
        comic = import_single_file(db, file)
    except ImportErrorHTTP:
        db.rollback()
        raise
    except Exception as exc:  # pragma: no cover - defensive
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    return ComicDetail.model_validate(serialize_comic_detail(comic))


@router.post("/upload-folder", response_model=ComicDetail, status_code=status.HTTP_201_CREATED)
def upload_folder(
    db: SessionDep,
    _auth: AuthDep,
    files: list[UploadFile] = File(...),
    paths: list[str] = Form(...),
) -> ComicDetail:
    try:
        comic = import_image_folder(db, files, paths)
    except ImportErrorHTTP:
        db.rollback()
        raise
    except Exception as exc:  # pragma: no cover - defensive
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    return ComicDetail.model_validate(serialize_comic_detail(comic))


@router.get("/{comic_id}", response_model=ComicDetail)
def get_comic(comic_id: str, db: SessionDep, _auth: AuthDep) -> ComicDetail:
    comic = get_or_404(db, comic_id)
    return ComicDetail.model_validate(serialize_comic_detail(comic))


@router.patch("/{comic_id}", response_model=ComicDetail)
def update_comic_metadata(comic_id: str, payload: ComicUpdate, db: SessionDep, _auth: AuthDep) -> ComicDetail:
    comic = get_or_404(db, comic_id)

    if payload.read_status and payload.read_status not in VALID_READ_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid read status")
    if payload.default_reading_direction and payload.default_reading_direction not in {"ltr", "rtl"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reading direction")

    updates = payload.model_dump(exclude_unset=True)
    for field in [
        "title",
        "series",
        "volume",
        "issue_number",
        "author",
        "publisher",
        "summary",
        "favorite",
        "read_status",
        "default_reading_direction",
    ]:
        if field in updates:
            setattr(comic, field, updates[field])

    if "tags" in updates or "genres" in updates:
        replace_labels(db, comic, updates.get("tags", []) or [], updates.get("genres", []) or [])

    db.add(comic)
    db.commit()
    db.refresh(comic)
    return ComicDetail.model_validate(serialize_comic_detail(comic))


@router.delete("/{comic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comic(comic_id: str, db: SessionDep, _auth: AuthDep) -> Response:
    comic = get_or_404(db, comic_id)
    delete_comic_files(comic)
    db.delete(comic)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{comic_id}/cover", response_model=ComicDetail)
def upload_cover(comic_id: str, db: SessionDep, _auth: AuthDep, file: UploadFile = File(...)) -> ComicDetail:
    comic = get_or_404(db, comic_id)
    comic = set_manual_cover(comic, file, db)
    return ComicDetail.model_validate(serialize_comic_detail(comic))


@router.get("/{comic_id}/thumbnail")
def get_thumbnail(comic_id: str, db: SessionDep, _auth: AuthDep) -> FileResponse:
    comic = get_or_404(db, comic_id)
    thumb_path = Path(comic.cover_path) if comic.cover_path and Path(comic.cover_path).exists() else ensure_thumbnail(comic)
    return FileResponse(thumb_path, media_type="image/webp")


@router.get("/{comic_id}/pages/{page_number}")
def get_page_image(
    comic_id: str,
    page_number: int,
    db: SessionDep,
    _auth: AuthDep,
    max_dimension: int = Query(default=2400, ge=800, le=5000),
) -> FileResponse:
    comic = get_or_404(db, comic_id)
    if page_number < 1 or page_number > comic.page_count:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    image_path = ensure_page_cached(comic, page_number, max_dimension=max_dimension)
    return FileResponse(image_path, media_type="image/webp")


@router.put("/{comic_id}/progress", response_model=ComicDetail)
def set_progress(comic_id: str, payload: ProgressUpdate, db: SessionDep, _auth: AuthDep) -> ComicDetail:
    comic = get_or_404(db, comic_id)
    update_progress(comic, payload.current_page)
    db.add(comic)
    db.commit()
    db.refresh(comic)
    return ComicDetail.model_validate(serialize_comic_detail(comic))


@router.post("/{comic_id}/bookmarks", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
def add_bookmark(comic_id: str, payload: BookmarkCreate, db: SessionDep, _auth: AuthDep) -> BookmarkResponse:
    comic = get_or_404(db, comic_id)
    if payload.page > comic.page_count:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bookmark page is beyond the end of the comic")

    bookmark = Bookmark(comic_id=comic.id, page=payload.page, note=payload.note)
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return BookmarkResponse.model_validate({
        "id": bookmark.id,
        "page": bookmark.page,
        "note": bookmark.note,
        "created_at": bookmark.created_at,
    })


@router.delete("/{comic_id}/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(comic_id: str, bookmark_id: str, db: SessionDep, _auth: AuthDep) -> Response:
    comic = get_or_404(db, comic_id)
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id, Bookmark.comic_id == comic.id).first()
    if not bookmark:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found")
    db.delete(bookmark)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
