from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import AuthDep
from app.core.config import get_settings

router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/config")
def public_config(_auth: AuthDep) -> dict[str, bool | str]:
    settings = get_settings()
    return {
        "app_name": settings.app_name,
        "auth_enabled": settings.auth_enabled,
    }
