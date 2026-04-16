from __future__ import annotations

from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import SESSION_COOKIE_NAME, verify_session_token
from app.db.session import get_db

SessionDep = Annotated[Session, Depends(get_db)]


def require_auth_if_enabled(session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME)) -> str | None:
    settings = get_settings()
    if not settings.auth_enabled:
        return None

    session_data = verify_session_token(session_token)
    if not session_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return str(session_data.get("username"))


AuthDep = Annotated[str | None, Depends(require_auth_if_enabled)]
