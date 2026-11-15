# Kestrel Document Tracker: prototype (first slice)

A shared document checklist with reminders that the named Relationship Manager approves before
anything reaches the client, for sub-₹25L SME applications. It covers five screens from the
Stitch design (A queue, B checklist and timeline, C reminder composer, D analyst file view,
E oversight and audit), plus optional AI rewording and critique agents with per-call costing.

> **Prototype. Synthetic data only.** Every client, person, e-mail address (`.example` domain)
> and application ID (`KF-2026-XXXX`) is fictitious. There is no PAN, Aadhaar, GSTIN, account
> number or credit information. The app makes **no credit decision** and **writes to no core
> system**. A production build would run in Kestrel's **Azure India tenancy**, not on Vercel.

- Specification: [architecture_jtbd.md](architecture_jtbd.md)
- Design source: [Design/](Design/) (light `_1` screens are used)
- Stakeholder overview: [docs/kestrel-slice-overview.html](docs/kestrel-slice-overview.html) ([Markdown](docs/kestrel-slice-overview.md))
- **Demo script and implementation checklist: [docs/demo-guide.md](docs/demo-guide.md)**

## Repository layout

```
backend/    FastAPI app (app/), Alembic migrations, pytest tests, pinned requirements
frontend/   Vite + TypeScript screens built from the Stitch markup, Vitest, Playwright smoke
api/        Vercel entry point (index.py); see also vercel.json, requirements.txt
.github/    ci.yml (tests on pull requests)
*.bat       start-demo, reset-demo (local), seed-vercel-db (Neon on Vercel)
Dockerfile  optional container build for other hosts (not used by Vercel)
```

## Local setup

Requires Python 3.12 and Node 24 (Node 22 or newer works).

```bash
# 1. Backend
python3.12 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r backend/requirements-dev.txt

# 2. Frontend (Tailwind runs at build time; the browser gets plain CSS)
cd frontend && npm install && npm run build && cd ..

# 3. Configuration: copy the example and set your own password pattern
cp .env.example .env
#   DEMO_PASSWORD_TEMPLATE={Name}@YourSuffix     (sets every demo user's password; never commit .env)
#   SESSION_SECRET=$(python -c "import secrets;print(secrets.token_urlsafe(48))")
#   COOKIE_SECURE=false                    (local http only)

# 4. Database and synthetic data (SQLite by default; re-runnable)
cd backend
python -m app.seed            # creates the schema (Alembic) and loads 12 synthetic applications
python -m app.seed --reset    # wipe and reload (destroys the local demo event log)

# 5. Run
uvicorn app.main:app --reload --port 8000
# open http://127.0.0.1:8000 and sign in, e.g. username vikram, password Vikram@YourSuffix
```

For frontend work with hot reload, run `npm run dev` in `frontend/` (it proxies `/api` and `/auth` to
port 8000) and open the Vite URL.

### Demo roles

Use the swap icon in the left rail (or click your name) to act as any fictitious user:

| Person | Role | Sees |
|---|---|---|
| Vikram Desai, Priya Sharma, Rohan Mehta, Arjun Nair | RM | A, B, C for **their own** files; only they can approve their reminders |
| Sunita Rao | Credit Operations Coordinator | Full queue, B and C; marks documents received, waives; cannot approve |
| Ananya Sengupta, Karan Iyer | Credit Analyst | D for assigned files, B read-only, "Request from RM" |
| Meera Kulkarni | Credit Manager | E: counts, audit log, AI costs; **agent on/off, budgets, prices** |
| Rahul Bhatia | CRO Oversight | E read-only: counts, audit log, AI costs; no client names |
| Kavya Menon | CFO Office (Finance) | AI Cost & Governance, read-only: cost so far, ledger, versions |
| Dev Raman | **AI Agent Owner** (separate login) | AI Agent Workbench only: prompts, tone, models, fallback, test runs, restore versions, costs |

**Sign-in:** every person has their own login. The username is their first name in lower case
(`vikram`, `sunita`, `dev`, ...). The password is `DEMO_PASSWORD_TEMPLATE` with `{Name}` replaced by
their first name, e.g. `{Name}@YourSuffix` gives `Vikram@YourSuffix`. There is no role switching: to see another
role, sign out and sign in as that person. Passwords are stored only as salted PBKDF2 hashes.

### Role-based access control (RBAC)

One permission matrix (`backend/app/domain/roles.py`) is enforced on every API call, with scopes
(own portfolio / assigned files / all). Agent configuration has **field-level** RBAC: the Credit
Manager owns business controls (on/off, budgets, prices); the AI Agent Owner owns behaviour
(prompt, tone, models, fallback, timeout). Open the role dialog (swap icon or your name) and click
**Show access-control matrix** to see exactly what each role can do.

### AI agents: the document-chase agent

The agentic workflow of this slice runs on Screen C ("Run document-chase agent"):
**Plan** (reads outstanding documents from the tracker) → **Act** (drafts from the approved
template) → **Rewriter** LLM → **Critic** LLM → one **Revise** pass if needed → **Hand-off** to
the named RM. It cannot send or approve. Every step (feature flag, agent enabled, budget, rate
limit, name redaction, exact prompt, each model call with tokens/latency/cost, output validation,
fallback) is recorded and shown in **View trace**.

Models (lite, cheap): primary **Gemini `gemini-3.5-flash-lite`**. Fallback: **Anthropic
`claude-haiku-5-5`** when `ANTHROPIC_API_KEY` is set (different provider), otherwise a second
Gemini model, **`gemini-3.1-flash-lite`** (Gemini-only setup). Add keys to `.env` and restart:

```
FEATURE_AI_DRAFTING=true
AI_DEMO_SIMULATE=false       # true = a provider without a key runs the labelled simulator
GEMINI_API_KEY=...           # real primary calls
# ANTHROPIC_API_KEY=...      # optional: cross-provider fallback
```

Then:
1. Sign in as **vikram** → Reminder Composer → **Run document-chase agent**
   → **View trace**. Approve and send yourself (only the named RM can).
2. Sign in as **dev** (AI Agent Owner) → **AI Agent Workbench** → edit the prompt and tone →
   **Run with this prompt** to see the output, every check and the cost → **Save** as a new
   version, or **Restore** an old version. Change the primary/fallback model and it applies to
   the very next call (no deploy or restart). **Cost incurred until now** shows all-time and
   monthly cost, real versus simulated, by agent and by model, plus task- and outcome-based charges.
3. Sign in as **meera** → Oversight → AI Agent Governance to switch an
   agent off, set budgets or prices; **Rahul Bhatia** sees the same read-only.

## Tests

```bash
cd backend
pytest                       # 71 tests: rules, approval, RBAC, agent owner, audit chain, agents, traces
ruff check . && ruff format --check . && mypy

cd frontend
npm test                     # Vitest: escaping, IST dates, routing, status chips
npm run build                # TypeScript type-check + Vite build

# Playwright smoke test (loads every screen under the right role) against a running server:
npx playwright install chromium
DEMO_PASSWORD_TEMPLATE='{Name}@YourSuffix' npx playwright test
# against the deployed URL: BASE_URL=https://... DEMO_PASSWORD_TEMPLATE='<pattern>' npx playwright test
```

## Docker

```bash
docker build -t kestrel-tracker .
docker run --rm -p 8080:8080 -e APP_ENV=local -e COOKIE_SECURE=false \
  -e SESSION_SECRET=<random> \
  -e DATABASE_URL=sqlite:////tmp/k.db kestrel-tracker
curl localhost:8080/healthz   # {"status":"ok","version":"0.1.0"}
```

## Deploy to Vercel

The app runs on Vercel as one Python function (`api/index.py` → FastAPI), which also serves the
built frontend (`frontend/dist`, committed to the repo). Vercel has no persistent disk, so data
lives in a hosted **Postgres (Neon)** database. No secret is stored in the repository.

1. **Import the repo**: vercel.com → *Add New… → Project* → import `Kestrel` from GitHub.
   Framework preset: **Other**. Leave build settings as they are (`vercel.json` configures them).
2. **Add a database**: in the Vercel project → *Storage* → *Create Database* → **Neon (Postgres)**
   → connect it to the project. This adds `DATABASE_URL` to the project's environment variables.
3. **Environment variables** (*Settings → Environment Variables*):

   | Name | Value |
   |---|---|
   | `APP_ENV` | `production` |
   | `SESSION_SECRET` | a long random string, e.g. output of `python -c "import secrets;print(secrets.token_urlsafe(48))"` |
   | `COOKIE_SECURE` | `true` |
   | `FEATURE_AI_DRAFTING` | `true` (or `false` to hide AI) |
   | `AI_DEMO_SIMULATE` | `false` |
   | `GEMINI_API_KEY` | your Gemini key |
   | `DATABASE_URL` | added by step 2 (Neon) |

4. **Deploy** (*Deployments → Redeploy*, or push to `main`).
5. **Create the tables and demo logins** in Neon, once, from your machine: double-click
   **`seed-vercel-db.bat`** and paste the Neon `DATABASE_URL` when asked. Passwords follow
   `DEMO_PASSWORD_TEMPLATE` in your local `.env` (e.g. `Vikram@YourSuffix`). Re-run it any time to
   reset the demo data.
6. Open the Vercel URL (e.g. `https://kestrel-<something>.vercel.app`) and sign in.

**Cost**: Vercel Hobby and Neon's free tier cover a demo; Gemini Flash-Lite calls cost about
$0.0002 each and are shown per call in the app.

**Tear down**: delete the Vercel project (*Settings → Advanced → Delete*) and the Neon database
(*Storage*).
