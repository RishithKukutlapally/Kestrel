"""Vercel entry point: exposes the FastAPI app (backend/app/main.py) as a Python function.

Vercel routes every request here (see vercel.json). The built frontend (frontend/dist) is
bundled with the function and served by FastAPI from the same origin, behind the login.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.main import app  # noqa: E402,F401
