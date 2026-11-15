"""Per-person sign-in for the prototype.

Each fictitious staff member has a username and a password. Passwords are stored only as salted
PBKDF2-SHA256 hashes. The password pattern for the demo users comes from DEMO_PASSWORD_TEMPLATE
(local .env or Secret Manager), never from the repository. A successful sign-in sets a signed
session cookie (Starlette SessionMiddleware: HttpOnly, SameSite=Lax, Secure when
COOKIE_SECURE=true). The session is bound to that person; there is no role switching.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_session
from app.models import Staff

_attempts: dict[str, deque[float]] = defaultdict(deque)
MAX_ATTEMPTS_PER_MINUTE = 10


# ---------------------------------------------------------------- password hashing
def hash_password(password: str, iterations: int | None = None) -> str:
    n = iterations or get_settings().password_hash_iterations
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, n)
    b64 = base64.b64encode
    return f"pbkdf2_sha256${n}${b64(salt).decode()}${b64(digest).decode()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        algo, n, salt_b64, hash_b64 = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        salt, expected = base64.b64decode(salt_b64), base64.b64decode(hash_b64)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(n))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest, expected)


# A fixed dummy hash keeps response time similar for unknown usernames.
_DUMMY_HASH: str | None = None


def authenticate(session: Session, username: str, password: str) -> Staff | None:
    global _DUMMY_HASH
    user = session.scalar(
        select(Staff).where(func.lower(Staff.username) == username.strip().lower())
    )
    if user is None:
        if _DUMMY_HASH is None:
            _DUMMY_HASH = hash_password(secrets.token_urlsafe(16))
        verify_password(password, _DUMMY_HASH)
        return None
    return user if verify_password(password, user.password_hash) else None


# ---------------------------------------------------------------- throttling
def throttled(client_ip: str) -> bool:
    """True when this client has had too many failed attempts in the last minute."""
    now = time.monotonic()
    q = _attempts[client_ip]
    while q and now - q[0] > 60:
        q.popleft()
    return len(q) >= MAX_ATTEMPTS_PER_MINUTE


def record_failure(client_ip: str) -> None:
    _attempts[client_ip].append(time.monotonic())


def reset_throttle() -> None:
    _attempts.clear()


# ---------------------------------------------------------------- session
def is_authenticated(request: Request) -> bool:
    return bool(request.session.get("auth")) and bool(request.session.get("staff_id"))


def current_user(request: Request, session: Session = Depends(get_session)) -> Staff:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="login required")
    user = session.get(Staff, request.session.get("staff_id"))
    if user is None:
        request.session.clear()
        raise HTTPException(status_code=401, detail="login required")
    return user
