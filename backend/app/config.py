"""Application settings, read from environment variables (and a local .env file).

Nothing secret has a default here. APP_ACCESS_CODE, SESSION_SECRET, the database
password and GEMINI_API_KEY come from the environment (Secret Manager on GCP).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL, make_url

APP_VERSION = "0.1.0"

# Repository root: backend/app/config.py -> parents[2]
REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    app_env: str = Field(default="local", description="local | production")
    app_version: str = APP_VERSION

    # Database. SQLite locally; Cloud SQL for PostgreSQL on GCP, e.g.
    # postgresql+psycopg://kestrel@/kestrel?host=/cloudsql/PROJECT:REGION:INSTANCE
    database_url: str = f"sqlite:///{(REPO_ROOT / 'kestrel.db').as_posix()}"
    # Optional: injected into DATABASE_URL so the password lives only in Secret Manager.
    db_password: SecretStr | None = None

    # Sign-in: each demo person has a username and password. Passwords follow this pattern
    # (e.g. "{Name}@YourSuffix" -> Vikram@YourSuffix). Set it in .env locally (not in the repository);
    # it is never stored in the repository. Only salted hashes are stored in the database.
    demo_password_template: SecretStr | None = None
    password_hash_iterations: int = 200_000
    session_secret: SecretStr | None = None
    cookie_secure: bool = True
    session_max_age_seconds: int = 8 * 60 * 60

    # ASSUMPTION (Operations to confirm): an item is "due today" from its due date
    # until OVERDUE_AFTER_DAYS later, when it becomes overdue. Calendar days.
    overdue_after_days: int = 2
    # ASSUMPTION: default deadline given to the client when a request is created.
    default_due_in_days: int = 5

    # Optional AI agents (reminder rewording + critique). Off by default.
    feature_ai_drafting: bool = False
    gemini_api_key: SecretStr | None = None
    anthropic_api_key: SecretStr | None = None
    # Default model IDs, one place each. Gemini checked against Google's pricing page on
    # 2026-11-13 (gemini-2.5-flash is deprecated from 2026-12-01). Live per-agent choices are
    # stored in the agent_configs table and changed from the Oversight screen.
    gemini_model: str = "gemini-3.5-flash-lite"
    anthropic_model: str = "claude-haiku-5-5"
    # Used as the fallback when no Anthropic key is configured (Gemini-only setup).
    gemini_fallback_model: str = "gemini-3.1-flash-lite"
    # Demo only: when a provider has no API key, run the built-in simulator instead and label
    # every result and cost "simulated". Never enable in production.
    ai_demo_simulate: bool = False
    # Placeholder FX rate for showing USD token costs in INR. Finance to confirm.
    usd_inr_rate: float = 84.0
    ai_tasks_per_user_per_hour: int = 30

    # Built frontend (Vite output)
    static_dir: Path = REPO_ROOT / "frontend" / "dist"

    @field_validator(
        "gemini_api_key",
        "anthropic_api_key",
        "demo_password_template",
        "session_secret",
        mode="before",
    )
    @classmethod
    def _strip_secret(cls, v: object) -> object:
        """Tolerate stray spaces/quotes in .env; treat blank as not set."""
        if isinstance(v, str):
            v = v.strip().strip('"').strip("'").strip()
            return v or None
        return v

    @property
    def sqlalchemy_url(self) -> URL:
        url = make_url(self.database_url)
        # Hosted Postgres (Neon / Vercel / Heroku style) gives postgres:// or postgresql://;
        # use the psycopg 3 driver this app ships with.
        if url.drivername in ("postgres", "postgresql"):
            url = url.set(drivername="postgresql+psycopg")
        if self.db_password is not None and url.password is None:
            url = url.set(password=self.db_password.get_secret_value())
        return url

    @property
    def ai_drafting_enabled(self) -> bool:
        return self.feature_ai_drafting and (
            self.gemini_api_key is not None
            or self.anthropic_api_key is not None
            or self.ai_demo_simulate
        )

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
