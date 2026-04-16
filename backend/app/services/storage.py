from __future__ import annotations

from pathlib import Path
from typing import Iterable

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.comic import Comic
from app.services.metadata import extract_metadata_from_name
from app.services.page_sources import PageSourceError, build_manifest, read_page_bytes
from app.utils.files import (
    SUPPORTED_ARCHIVE_EXTENSIONS,
    copy_fileobj,
    detect_source_type,
    ensure_relative_path,
    is_image_filename,
    safe_rmtree,
    safe_unlink,
)
from app.utils.image import save_resized_webp, save_webp_thumbnail

settings = get_settings()


class ImportErrorHTTP(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def comic_storage_dir(comic_id: str) -> Path:
    return settings.library_root_path / comic_id


def comic_manifest_path(comic_id: str) -> Path:
    return comic_storage_dir(comic_id) / "manifest.json"


def comic_auto_thumb_path(comic_id: str) -> Path:
    return settings.thumb_cache_root / f"{comic_id}.webp"


def comic_manual_cover_path(comic_id: str) -> Path:
    return settings.manual_cover_root / f"{comic_id}.webp"


def comic_page_cache_path(comic_id: str, page_number: int, max_dimension: int) -> Path:
    return settings.page_cache_root / comic_id / str(max_dimension) / f"{page_number:04d}.webp"


def _validate_upload_extension(filename: str) -> None:
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_ARCHIVE_EXTENSIONS:
        raise ImportErrorHTTP(
            f"Unsupported upload format '{extension}'. Supported formats: CBZ, CBR, PDF, ZIP."
        )


def _ensure_nonempty_manifest(pages_count: int) -> None:
    if pages_count < 1:
        raise ImportErrorHTTP("No readable pages were found in the uploaded comic.")


def import_single_file(db: Session, upload: UploadFile) -> Comic:
    if not upload.filename:
        raise ImportErrorHTTP("Uploaded file is missing a filename.")

    _validate_upload_extension(upload.filename)

    comic = Comic(
        original_filename=upload.filename,
        title=Path(upload.filename).stem,
        source_type=detect_source_type(upload.filename),
        original_path="",
        manifest_path="",
    )
    db.add(comic)
    db.flush()

    comic_dir = comic_storage_dir(comic.id)
    comic_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(upload.filename).suffix.lower()
    source_path = comic_dir / f"source{extension}"
    copy_fileobj(upload, source_path)

    manifest_path = comic_manifest_path(comic.id)
    try:
        _pages, page_count = build_manifest(comic.source_type, source_path, manifest_path)
    except PageSourceError as exc:
        safe_rmtree(comic_dir)
        raise ImportErrorHTTP(str(exc)) from exc

    _ensure_nonempty_manifest(page_count)
    extracted = extract_metadata_from_name(upload.filename, None)

    comic.original_path = str(source_path)
    comic.manifest_path = str(manifest_path)
    comic.title = extracted["title"] or Path(upload.filename).stem
    comic.series = extracted["series"]
    comic.volume = extracted["volume"]
    comic.issue_number = extracted["issue_number"]
    comic.metadata_source = str(extracted["metadata_source"])
    comic.page_count = page_count

    ensure_thumbnail(comic)
    db.commit()
    db.refresh(comic)
    return comic


def import_image_folder(db: Session, files: list[UploadFile], relative_paths: list[str]) -> Comic:
    if not files:
        raise ImportErrorHTTP("No files were uploaded.")
    if len(files) != len(relative_paths):
        raise ImportErrorHTTP("Folder upload paths did not match the uploaded file list.")

    cleaned_paths = [ensure_relative_path(path) for path in relative_paths]
    image_pairs = [(upload, rel_path) for upload, rel_path in zip(files, cleaned_paths, strict=True) if is_image_filename(rel_path)]
    if not image_pairs:
        raise ImportErrorHTTP("The uploaded folder did not contain supported image files.")

    root_name = Path(image_pairs[0][1]).parts[0] if Path(image_pairs[0][1]).parts else "Imported Folder"

    comic = Comic(
        original_filename=root_name,
        title=root_name,
        source_type="folder",
        original_path="",
        manifest_path="",
    )
    db.add(comic)
    db.flush()

    source_dir = comic_storage_dir(comic.id) / "source"
    source_dir.mkdir(parents=True, exist_ok=True)

    for upload, relative_path in image_pairs:
        target = source_dir / ensure_relative_path(relative_path)
        copy_fileobj(upload, target)

    manifest_path = comic_manifest_path(comic.id)
    try:
        _pages, page_count = build_manifest("folder", source_dir, manifest_path)
    except PageSourceError as exc:
        safe_rmtree(source_dir.parent)
        raise ImportErrorHTTP(str(exc)) from exc

    _ensure_nonempty_manifest(page_count)
    extracted = extract_metadata_from_name(root_name, root_name)

    comic.original_path = str(source_dir)
    comic.manifest_path = str(manifest_path)
    comic.title = extracted["title"] or root_name
    comic.series = extracted["series"]
    comic.volume = extracted["volume"]
    comic.issue_number = extracted["issue_number"]
    comic.metadata_source = str(extracted["metadata_source"])
    comic.page_count = page_count

    ensure_thumbnail(comic)
    db.commit()
    db.refresh(comic)
    return comic


def ensure_thumbnail(comic: Comic, force: bool = False) -> Path:
    manual_path = comic_manual_cover_path(comic.id)
    if manual_path.exists() and not force:
        return manual_path

    thumb_path = comic_auto_thumb_path(comic.id)
    if thumb_path.exists() and not force:
        return thumb_path

    page_bytes = read_page_bytes(comic, 1, max_dimension=max(settings.page_cache_max_dimension, 1600))
    save_webp_thumbnail(
        data=page_bytes,
        destination=thumb_path,
        width=settings.thumbnail_width,
        height=settings.thumbnail_height,
    )
    return thumb_path


def set_manual_cover(comic: Comic, file: UploadFile, db: Session) -> Comic:
    if not file.filename:
        raise ImportErrorHTTP("Cover upload is missing a filename.")
    if not is_image_filename(file.filename):
        raise ImportErrorHTTP("Cover upload must be an image file.")

    destination = comic_manual_cover_path(comic.id)
    data = file.file.read()
    save_webp_thumbnail(
        data=data,
        destination=destination,
        width=settings.thumbnail_width * 2,
        height=settings.thumbnail_height * 2,
        quality=90,
    )
    comic.cover_path = str(destination)
    db.add(comic)
    db.commit()
    db.refresh(comic)
    return comic


def ensure_page_cached(comic: Comic, page_number: int, max_dimension: int | None = None) -> Path:
    size = max_dimension or settings.page_cache_max_dimension
    size = max(800, min(size, 5000))
    cache_path = comic_page_cache_path(comic.id, page_number, size)
    if cache_path.exists():
        return cache_path

    page_bytes = read_page_bytes(comic, page_number, max_dimension=size)
    if comic.source_type == "pdf":
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(page_bytes)
        return cache_path

    save_resized_webp(page_bytes, cache_path, max_dimension=size)
    return cache_path


def purge_page_cache(comic_id: str) -> None:
    safe_rmtree(settings.page_cache_root / comic_id)


def delete_comic_files(comic: Comic) -> None:
    safe_rmtree(comic_storage_dir(comic.id))
    safe_rmtree(settings.page_cache_root / comic.id)
    safe_unlink(comic_auto_thumb_path(comic.id))
    safe_unlink(comic_manual_cover_path(comic.id))
