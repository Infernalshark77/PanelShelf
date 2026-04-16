from __future__ import annotations

import os
import re
import shutil
from pathlib import Path

SUPPORTED_ARCHIVE_EXTENSIONS = {".cbz", ".zip", ".cbr", ".pdf"}
SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"}


class UnsupportedFileTypeError(ValueError):
    pass


_natural_pattern = re.compile(r"(\d+)")


def natural_sort_key(value: str) -> list[int | str]:
    return [int(part) if part.isdigit() else part.lower() for part in _natural_pattern.split(value)]


def detect_source_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in {".cbz", ".zip"}:
        return "archive"
    if ext == ".cbr":
        return "rar"
    if ext == ".pdf":
        return "pdf"
    raise UnsupportedFileTypeError(f"Unsupported file type: {ext}")


def is_image_filename(filename: str) -> bool:
    return Path(filename).suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS


def ensure_relative_path(raw_path: str) -> str:
    normalized = raw_path.replace("\\", "/").lstrip("/")
    parts = [part for part in normalized.split("/") if part not in {"", ".", ".."}]
    return "/".join(parts)


def copy_fileobj(upload_file, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as output:
        shutil.copyfileobj(upload_file.file, output)


def stream_copy(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def safe_unlink(path: str | Path | None) -> None:
    if not path:
        return
    try:
        Path(path).unlink(missing_ok=True)
    except OSError:
        pass


def safe_rmtree(path: str | Path | None) -> None:
    if not path:
        return
    try:
        shutil.rmtree(path, ignore_errors=True)
    except OSError:
        pass


def path_size_mb(path: Path) -> float:
    if path.is_file():
        return round(path.stat().st_size / (1024 * 1024), 2)
    total = 0
    for root, _dirs, files in os.walk(path):
        for file_name in files:
            total += (Path(root) / file_name).stat().st_size
    return round(total / (1024 * 1024), 2)
