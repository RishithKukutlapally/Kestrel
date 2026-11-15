"""FastAPI entrypoint: API, access gate, health check and the built frontend (same origin)."""

from __future__ import annotations

import logging
import secrets
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Form, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.middleware.sessions import SessionMiddleware

from app.api import router
from app.auth import authenticate, is_authenticated, record_failure, throttled
from app.config import Settings, get_settings
from app.db import get_session
from app.domain.roles import DomainError

log = logging.getLogger("kestrel")

CSP = (
    "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; "
    "style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; "
    "font-src https://fonts.gstatic.com; "
    "frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
)


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        resp = await call_next(request)
        resp.headers.setdefault("Content-Security-Policy", CSP)
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Referrer-Policy"] = "no-referrer"
        if request.url.path.startswith("/api") or request.url.path in ("/", "/login"):
            resp.headers["Cache-Control"] = "no-store"
        return resp


def _session_secret(settings: Settings) -> str:
    if settings.session_secret is not None and settings.session_secret.get_secret_value():
        return settings.session_secret.get_secret_value()
    if settings.is_production:
        raise RuntimeError("SESSION_SECRET must be set in production")
    log.warning("SESSION_SECRET not set; using a random per-process key (local only)")
    return secrets.token_urlsafe(48)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="Kestrel Document Tracker (prototype)",
        version=settings.app_version,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.add_middleware(SecurityHeaders)
    app.add_middleware(
        SessionMiddleware,
        secret_key=_session_secret(settings),
        session_cookie="kestrel_session",
        max_age=settings.session_max_age_seconds,
        same_site="lax",
        https_only=settings.cookie_secure,
    )

    @app.exception_handler(DomainError)
    async def domain_error(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=exc.status_code)

    app.include_router(router)

    @app.get("/healthz")
    def healthz() -> dict[str, Any]:
        return {"status": "ok", "version": settings.app_version}

    dist: Path = settings.static_dir

    def page(name: str) -> Response:
        f = dist / name
        if not f.exists():
            return HTMLResponse(
                f"<p>Frontend not built: run npm run build ({name}).</p>", status_code=503
            )
        return FileResponse(f, media_type="text/html")

    @app.get("/login", include_in_schema=False)
    def login_page(request: Request) -> Response:
        if is_authenticated(request):
            return RedirectResponse("/", status_code=303)
        return page("login.html")

    @app.post("/auth/login", include_in_schema=False)
    def login(
        request: Request,
        username: str = Form(default="", max_length=40),
        password: str = Form(default="", max_length=200),
        session: Session = Depends(get_session),
    ) -> Response:
        ip = request.client.host if request.client else "unknown"
        if throttled(ip):
            return RedirectResponse("/login?error=throttled", status_code=303)
        user = authenticate(session, username, password)
        if user is None:
            record_failure(ip)
            log.info("login failed")
            return RedirectResponse("/login?error=1", status_code=303)
        # The session is bound to this one person; their role decides what they see.
        request.session.clear()
        request.session["auth"] = True
        request.session["staff_id"] = user.id
        log.info("login ok role=%s", user.role)
        return RedirectResponse("/", status_code=303)

    @app.post("/auth/logout", include_in_schema=False)
    def logout(request: Request) -> Response:
        request.session.clear()
        return RedirectResponse("/login", status_code=303)

    @app.get("/", include_in_schema=False)
    def index(request: Request) -> Response:
        if not is_authenticated(request):
            return RedirectResponse("/login", status_code=303)
        return page("index.html")

    # Hashed JS/CSS bundles. They contain no data; every data call goes through /api.
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    return app


logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
app = create_app()
