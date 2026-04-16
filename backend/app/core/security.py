from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from itsdangerous import BadSignature, URLSafeTimedSerializer

from app.core.config import get_settings

SESSION_COOKIE_NAME = "panelshelf_session"


def _serializer() -> URLSafeTimedSerializer:
    settings = get_settings()
    return URLSafeTimedSerializer(settings.secret_key, salt="panelshelf-auth")


def create_session_token(username: str) -> str:
    issued_at = datetime.now(timezone.utc).isoformat()
    return _serializer().dumps({"username": username, "issued_at": issued_at})


def verify_session_token(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None

    settings = get_settings()
    max_age_seconds = int(timedelta(hours=settings.session_ttl_hours).total_seconds())
    try:
        return _serializer().loads(token, max_age=max_age_seconds)
    except BadSignature:
        return None


def auth_enabled() -> bool:
    return bool(get_settings().auth_enabled)
