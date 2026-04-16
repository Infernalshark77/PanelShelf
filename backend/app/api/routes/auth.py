from __future__ import annotations

import secrets

from fastapi import APIRouter, Cookie, HTTPException, Response, status

from app.core.config import get_settings
from app.core.security import SESSION_COOKIE_NAME, create_session_token, verify_session_token
from app.schemas.auth import AuthStatus, LoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=AuthStatus)
def auth_me(session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME)) -> AuthStatus:
    settings = get_settings()
    if not settings.auth_enabled:
        return AuthStatus(auth_enabled=False, authenticated=True, username=None)

    data = verify_session_token(session_token)
    if not data:
        return AuthStatus(auth_enabled=True, authenticated=False, username=None)

    return AuthStatus(auth_enabled=True, authenticated=True, username=str(data.get("username")))


@router.post("/login", response_model=AuthStatus)
def login(payload: LoginRequest, response: Response) -> AuthStatus:
    settings = get_settings()
    if not settings.auth_enabled:
        return AuthStatus(auth_enabled=False, authenticated=True, username=None)

    username_ok = secrets.compare_digest(payload.username, settings.app_username)
    password_ok = secrets.compare_digest(payload.password, settings.app_password)
    if not (username_ok and password_ok):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_session_token(payload.username)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.session_ttl_hours * 3600,
    )
    return AuthStatus(auth_enabled=True, authenticated=True, username=payload.username)


@router.post("/logout", response_model=AuthStatus)
def logout(response: Response) -> AuthStatus:
    settings = get_settings()
    response.delete_cookie(key=SESSION_COOKIE_NAME)
    if not settings.auth_enabled:
        return AuthStatus(auth_enabled=False, authenticated=True, username=None)
    return AuthStatus(auth_enabled=True, authenticated=False, username=None)
