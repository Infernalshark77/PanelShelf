from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps


Image.MAX_IMAGE_PIXELS = None


def open_image_from_bytes(data: bytes) -> Image.Image:
    with Image.open(BytesIO(data)) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


def save_webp_thumbnail(data: bytes, destination: Path, width: int, height: int, quality: int = 82) -> None:
    image = open_image_from_bytes(data)
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, format="WEBP", quality=quality, method=6)


def save_resized_webp(data: bytes, destination: Path, max_dimension: int, quality: int = 88) -> None:
    image = open_image_from_bytes(data)
    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, format="WEBP", quality=quality, method=6)
