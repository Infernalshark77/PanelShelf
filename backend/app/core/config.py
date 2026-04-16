from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PanelShelf"
    app_env: str = "development"
    secret_key: str = Field(default="change-me-in-production", min_length=16)

    auth_enabled: bool = True
    app_username: str = "admin"
    app_password: str = "change-me"
    session_ttl_hours: int = 24 * 30

    database_url: str = "sqlite:////data/app.db"

    library_root: str = "/data/library"
    cache_root: str = "/data/cache"
    media_root: str = "/data/media"

    thumbnail_width: int = 400
    thumbnail_height: int = 600
    page_cache_max_dimension: int = 2400
    cors_origins: str = "http://localhost:5173,http://localhost:8000,http://localhost:8080"
    max_upload_size_mb: int = 1024

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def library_root_path(self) -> Path:
        return Path(self.library_root)

    @property
    def cache_root_path(self) -> Path:
        return Path(self.cache_root)

    @property
    def media_root_path(self) -> Path:
        return Path(self.media_root)

    @property
    def page_cache_root(self) -> Path:
        return self.cache_root_path / "pages"

    @property
    def thumb_cache_root(self) -> Path:
        return self.cache_root_path / "thumbs"

    @property
    def manual_cover_root(self) -> Path:
        return self.media_root_path / "covers"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def ensure_directories(self) -> None:
        for path in [
            self.library_root_path,
            self.cache_root_path,
            self.media_root_path,
            self.page_cache_root,
            self.thumb_cache_root,
            self.manual_cover_root,
        ]:
            path.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_directories()
    return settings
