from __future__ import annotations

import json
import math
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Any

import fitz
import rarfile
from PIL import Image

from app.models.comic import Comic
from app.utils.files import ensure_relative_path, is_image_filename, natural_sort_key

rarfile.UNRAR_TOOL = "unar"


class PageSourceError(RuntimeError):
    pass


def build_manifest(source_type: str, source_path: Path, manifest_path: Path) -> tuple[list[dict[str, Any]], int]:
    pages: list[dict[str, Any]] = []

    if source_type == "archive":
        with zipfile.ZipFile(source_path) as archive:
            names = [name for name in archive.namelist() if is_image_filename(name)]
        for idx, name in enumerate(sorted(names, key=natural_sort_key), start=1):
            pages.append({"index": idx, "path": name, "label": Path(name).name})

    elif source_type == "rar":
        with rarfile.RarFile(source_path) as archive:
            names = [info.filename for info in archive.infolist() if not info.isdir() and is_image_filename(info.filename)]
        for idx, name in enumerate(sorted(names, key=natural_sort_key), start=1):
            pages.append({"index": idx, "path": name, "label": Path(name).name})

    elif source_type == "pdf":
        with fitz.open(source_path) as document:
            for idx in range(document.page_count):
                pages.append({"index": idx + 1, "path": str(idx + 1), "label": f"Page {idx + 1}"})

    elif source_type == "folder":
        names = []
        for file_path in source_path.rglob("*"):
            if file_path.is_file() and is_image_filename(file_path.name):
                names.append(file_path.relative_to(source_path).as_posix())
        for idx, name in enumerate(sorted(names, key=natural_sort_key), start=1):
            pages.append({"index": idx, "path": name, "label": Path(name).name})
    else:
        raise PageSourceError(f"Unknown source type: {source_type}")

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps({"pages": pages}, indent=2), encoding="utf-8")
    return pages, len(pages)


def read_manifest(manifest_path: str | Path) -> list[dict[str, Any]]:
    data = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    return data.get("pages", [])


def _get_entry(manifest_path: str | Path, page_number: int) -> dict[str, Any]:
    pages = read_manifest(manifest_path)
    if page_number < 1 or page_number > len(pages):
        raise PageSourceError("Page out of range")
    return pages[page_number - 1]


def _image_bytes_from_archive(source_path: Path, entry_path: str) -> bytes:
    with zipfile.ZipFile(source_path) as archive:
        return archive.read(entry_path)


def _image_bytes_from_rar(source_path: Path, entry_path: str) -> bytes:
    with rarfile.RarFile(source_path) as archive:
        return archive.read(entry_path)


def _image_bytes_from_folder(source_path: Path, entry_path: str) -> bytes:
    target = source_path / ensure_relative_path(entry_path)
    return target.read_bytes()


def _render_pdf_page(source_path: Path, page_number: int, max_dimension: int) -> bytes:
    with fitz.open(source_path) as document:
        page = document.load_page(page_number - 1)
        rect = page.rect
        largest_edge = max(rect.width, rect.height) or 1
        scale = max(max_dimension / largest_edge, 0.5)
        matrix = fitz.Matrix(scale, scale)
        pixmap = page.get_pixmap(matrix=matrix, alpha=False)
        data = pixmap.tobytes("png")

    image = Image.open(BytesIO(data)).convert("RGB")
    output = BytesIO()
    image.save(output, format="WEBP", quality=88, method=6)
    return output.getvalue()


def read_page_bytes(comic: Comic, page_number: int, max_dimension: int) -> bytes:
    entry = _get_entry(comic.manifest_path, page_number)
    source_path = Path(comic.original_path)

    if comic.source_type == "archive":
        return _image_bytes_from_archive(source_path, entry["path"])
    if comic.source_type == "rar":
        return _image_bytes_from_rar(source_path, entry["path"])
    if comic.source_type == "folder":
        return _image_bytes_from_folder(source_path, entry["path"])
    if comic.source_type == "pdf":
        return _render_pdf_page(source_path, page_number, max_dimension=max_dimension)

    raise PageSourceError(f"Unsupported comic source type: {comic.source_type}")


def estimate_pdf_scale(source_path: Path, page_number: int, max_dimension: int) -> float:
    with fitz.open(source_path) as document:
        page = document.load_page(page_number - 1)
        largest_edge = max(page.rect.width, page.rect.height) or 1
        return max(max_dimension / largest_edge, 0.5)
