# syntax=docker/dockerfile:1
# Multi-stage build: Node builds the static frontend; a slim Python image serves API + static
# files from one origin. Runs as a non-root user and listens on $PORT (default 8080).

# ---------- Stage 1: frontend ----------
FROM node:24-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080 \
    APP_ENV=production \
    STATIC_DIR=/app/frontend/dist

WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend /build/frontend/dist /app/frontend/dist

RUN useradd --system --uid 10001 --home /app --shell /usr/sbin/nologin kestrel \
    && chown -R kestrel /app
USER kestrel

EXPOSE 8080
# /healthz returns 200 with the app version (used by Cloud Run and the deploy smoke test).
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD python -c "import os,urllib.request;urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8080\")}/healthz',timeout=2)"

# Migrations run separately (Cloud Run job: `alembic upgrade head`), not at container start.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*'"]
