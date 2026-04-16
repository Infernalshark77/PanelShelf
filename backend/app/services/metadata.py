from __future__ import annotations

import re
from pathlib import Path

VOLUME_PATTERNS = [
    re.compile(r"(?:^|[\s._-])v(?:ol(?:ume)?)?\s*(\d+)(?:$|[\s._-])", re.IGNORECASE),
]
ISSUE_PATTERNS = [
    re.compile(r"(?:^|[\s._-])(?:issue|chapter|ch|c|#)\s*(\d+(?:\.\d+)?)(?:$|[\s._-])", re.IGNORECASE),
]


def _cleanup_title(name: str) -> str:
    value = Path(name).stem
    value = value.replace("_", " ").replace(".", " ")
    value = re.sub(r"\s+", " ", value).strip(" -_")
    return value


def extract_metadata_from_name(filename: str, parent_folder: str | None = None) -> dict[str, str | None]:
    stem = _cleanup_title(filename)
    series = _cleanup_title(parent_folder) if parent_folder else None

    volume = None
    for pattern in VOLUME_PATTERNS:
        match = pattern.search(stem)
        if match:
            volume = match.group(1)
            stem = pattern.sub(" ", stem)
            break

    issue_number = None
    for pattern in ISSUE_PATTERNS:
        match = pattern.search(stem)
        if match:
            issue_number = match.group(1)
            stem = pattern.sub(" ", stem)
            break

    title = re.sub(r"\s+", " ", stem).strip(" -_")
    if series and title.lower().startswith(series.lower()):
        title = title[len(series) :].strip(" -_:") or series

    if not title:
        title = _cleanup_title(filename)

    return {
        "title": title,
        "series": series,
        "volume": volume,
        "issue_number": issue_number,
        "metadata_source": "filename",
    }
