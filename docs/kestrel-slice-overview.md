# Kestrel Document Tracker: first slice

> **Prototype. Synthetic data only.**

One shared document checklist per SME application, with client reminders that the named Relationship Manager approves before anything is sent. This document covers what the slice solves, how it is built, the controls, the document-chase agent, and how AI cost and access are governed. It reflects the build as verified on 13 Nov 2026.

**Contents:** 1 The slice · 2 What it solves · 3 Architecture · 4 Controls · 5 Access control · 6 Document-chase agent · 7 Your AI questions · 8 UI mocks · 9 Trace and govern · 10 Verified · 11 Open decisions

## Summary

- **Scope:** simple applications under ₹25 lakh, one RM team, their credit analysts and the credit manager. No credit decision anywhere.
- **Built:** five screens (A–E) plus an AI Agent Workbench. One permission matrix is checked on every API call. The event log is append-only and hash-chained, RM approval is enforced on the server, and the data is 12 fictitious clients.
- **The document-chase agent:** plan, act, rewrite, critique, revise, then hand off to the named RM. Every step is traced and costed. The agent cannot send or approve anything.
- **Models:** lite models by default. Gemini `gemini-3.5-flash-lite` is the primary and Anthropic `claude-haiku-5-5` the fallback. A typical rewrite costs well under ₹0.10.
- **Verified 13 Nov 2026:** real Gemini calls worked. 71 backend tests, 8 unit tests and 4 browser tests pass.
- **Not yet:** no Anthropic key is set, so the fallback runs the simulator. The GCP deploy, Docker build and Postgres path are not verified. Production must run in Azure India.

## 1. The slice in one paragraph

RMs lose time and deals to repeated, piecemeal document requests. This slice gives each sub-₹25L SME application one checklist, generated from a versioned rule table (product, applicant type, loan band). Each item has a tracked status (requested, received, overdue, waived), and the client gets one reminder that lists every missing document with a deadline and the RM's name. The reminder is drafted automatically and sent only after the named RM approves it. This is **Opportunity 2**, the highest-scoring option (**ICE 7.3**), and it needs no hosted AI model to start. Statement and GST extraction is slice two.

| Baseline: application to decision | Baseline: withdrawal | Loan size in scope | Credit decisions |
|---|---|---|---|
| 18 working days | 22% | Under ₹25 lakh | None |

**Pilot measures**, all read from the event log:
- Working days to decision, against a matched comparison group
- Documents requested per case
- Days between requests
- Withdrawal rate
- Share of reminders approved without edits
- Analyst time to start analysis on a complete file

## 2. What it solves, by role

- **Relationship Manager.** *"Get one complete request to the client."* All missing items go out in one reminder with a deadline. The RM is the only person who can approve it.
- **Credit Ops Coordinator.** *"Prioritise the queue."* The queue is sorted by the oldest outstanding item, with filters for RM, stage and status. The coordinator confirms receipt of each document.
- **Credit Analyst.** *"Start on a complete file."* Each file is marked Complete or Blocked, with the exact blocking items. The analyst can raise a linked "Request from RM".
- **Credit Manager & CRO.** *"Oversee without approving automatically."* Counts and an audit log only, with no client-level data. The Credit Manager also sets the AI agents' business controls.
- **AI Agent Owner.** *"Keep the agents good and cheap."* Tunes prompts, tone and model routing, tests changes, restores versions and watches cost. Sees no client files and no audit log.
- **Corporate client.** *"One clear list with a deadline."* One message listing the documents, the due date and the RM's name, approved before it is sent.

### Screens and who sees each one

| Screen | RM | Coordinator | Analyst | Credit Manager | CRO | AI Agent Owner |
|---|---|---|---|---|---|---|
| A. Application queue | Own | All | No | No | No | No |
| B. Checklist & timeline | Own | All | Assigned, read-only | No | No | No |
| C. Reminder composer (+ document-chase agent) | Own; approve & send | All; cannot approve | No | No | No | No |
| D. Analyst file view | No | No | Assigned | No | No | No |
| E. Oversight & audit (+ agent governance) | No | No | No | Yes; business controls | Read-only | No |
| AI Agent Workbench | No | No | No | No | No | Only screen |

The AI Agent Workbench is not in the Stitch design. It was added at the stakeholder's request and uses the same visual tokens.

## 3. Architecture

| Component | Status | What it does |
|---|---|---|
| Checklist service | Built | Generates the required items from a **versioned rule table** keyed on product, applicant type and loan band. Staff can waive an item, but only with a recorded reason. |
| Document tracker | Built | Stores each item as requested, received or waived. **Overdue is derived, never stored**, from configurable thresholds (placeholder: due today from the due date, overdue two days after). |
| Event log | Built | Append-only, with actor, time and reason on every event. Rows are **SHA-256 hash-chained**, and database triggers reject UPDATE and DELETE on both SQLite and PostgreSQL. The timeline, queue ageing and metrics are read from it. |
| Reminder drafter, approval and send | Built | A template draft is held until the **named RM** approves it. Approval is the **only route to the client**. Mail is simulated in the prototype: nothing leaves the app. |
| AI agents and the document-chase agent | Built | A rewriter and a critic, each with a primary and a fallback model, plus the document-chase agent that orchestrates them. Every call is costed, every step is traced, and every configuration change is versioned. |
| Access control and presentation | Built | One **permission matrix** is checked on every API call, including field-level rules on agent settings. There are two login portals: staff, and AI Agent Owner. The session cookie is signed, HttpOnly, SameSite=Lax, and Secure over HTTPS. |

### Data flow

```
LOS (read-only; seed data in prototype)
   ▼
Checklist service ── items generated ── "request created" event per item
   ▼
Draft from template ── optionally reworded and checked by the document-chase agent
   ▼
Named RM approves ── server checks approver ── send (simulated) + events
   ▼
Receipt ── Ops marks received (stands in for the document store)
   ▼
All received/waived ── "file marked complete" event (nothing written back to the LOS)
```

### Prototype stack vs production target

| Concern | Prototype (this build) | Production target |
|---|---|---|
| Hosting | GCP Cloud Run behind access codes (**deploy not run**) | Kestrel's Azure India tenancy, private network, no public endpoints |
| Identity | Staff access code with a demo role switcher; a separate AI Agent Owner access code (`AGENT_OWNER_ACCESS_CODE`, Secret Manager secret `kestrel-agent-owner-code`) | Single sign-on with role groups |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2, Alembic | Same design, deployed in Azure |
| Database | SQLite locally; Cloud SQL for PostgreSQL on GCP (same code) | Database inside the tenancy |
| Frontend | Vite + TypeScript; Tailwind compiled at build time from the Stitch config | Same |
| AI providers | Gemini (`google-genai`) primary, Claude (`anthropic`) fallback, local simulator when a key is missing | Inside the Azure India tenancy with CIO/CISO approval |
| LOS, mail, document store | Seed data, simulated mailer, coordinator marks receipt by hand | Read-only LOS, existing mail system, document-store metadata |

## 4. Controls and one-way doors

- **Named-RM approval, enforced on the server.** Only the RM named on the draft can approve it, and that RM must still own the application. The send step re-checks this. Tests confirm every other role, including the AI agents, is refused.
- **Drafts never auto-send.** The background step only delivers reminders that were already approved for a later time. The agent's output is always a draft.
- **Waivers need a reason.** The reason, actor and time go into the event log.
- **No credit data, no credit decisions.** No amounts, scores, PAN, Aadhaar, GSTIN or account numbers exist in the schema, and no route approves or rejects credit. Tests scan every response for these terms.
- **No writes to the LOS.** The completion flag lives only in this slice's own view.
- **Audit trail cannot be edited.** Triggers block edits and deletes, and `GET /api/audit/verify` checks the hash chain. A sent reminder cannot be recalled, so approval is permanent.

## 5. Access control: one matrix, checked on every API call

The permission matrix lives in `backend/app/domain/roles.py` and is enforced on every API call. The UI reads the same matrix from `GET /api/rbac` and displays it in the role dialog (*"Show access-control matrix (RBAC)"*) and in the Workbench, but the server never trusts the UI. Scopes: **own** = the RM's portfolio, or the RM named on a draft; **assigned** = the analyst's files; **all** = everything the permission covers.

| Permission | RM | Coordinator | Analyst | Credit Manager | CRO | AI Agent Owner |
|---|---|---|---|---|---|---|
| `queue.view`: see the application queue | own | all | – | – | – | – |
| `application.view`: open checklist & timeline | own | all | assigned | – | – | – |
| `item.receive`: confirm a document was received | – | all | – | – | – | – |
| `item.waive`: waive a document (reason required) | own | all | – | – | – | – |
| `reminder.draft`: create and edit drafts | own | all | – | – | – | – |
| `reminder.approve_send`: approve, schedule, send | own (named RM only) | – | – | – | – | – |
| `ai.use`: AI reword, critique, document-chase agent | own | all | – | – | – | – |
| `analyst.view`: analyst file view | – | – | assigned | – | – | – |
| `analyst.request`: linked request to the RM | – | – | assigned | – | – | – |
| `oversight.view`: counts, no client data | – | – | – | all | all | – |
| `audit.view`: search and export the audit log | – | – | – | all | all | – |
| `agents.view_costs`: agent settings, cost ledger, versions | – | – | – | all | all | all |
| `agents.edit_business`: on/off, budgets, prices | – | – | – | all | – | – |
| `agents.edit_behaviour`: prompts, tone, models, fallback, timeout; restore versions | – | – | – | – | – | all |
| `agents.test`: test a prompt on synthetic sample text | – | – | – | – | – | all |

### Field-level access on agent settings

| Who | May change | Why |
|---|---|---|
| Credit Manager (`agents.edit_business`) | `enabled`, `monthly_budget_usd`, `task_price_inr`, `outcome_price_inr` | Business controls: whether the agent runs, and what it may spend and charge |
| AI Agent Owner (`agents.edit_behaviour`, `agents.test`) | `prompt`, `tone`, `primary_provider`/`primary_model`, `fallback_provider`/`fallback_model`, `timeout_seconds`, `simulate_primary_outage`; restore earlier versions; run test prompts | Behaviour: how the agent writes and which models serve it |
| CRO Oversight | Nothing (read-only) | Independent oversight |

A request that changes a field outside the caller's permission is refused with HTTP 403. Restoring a version rolls back only the fields the caller owns, and the restore is itself a new version.

### AI Agent Owner: a separate login

- The login page has an **"AI Agent Owner"** tab with its own access code (`AGENT_OWNER_ACCESS_CODE`, stored as Secret Manager secret `kestrel-agent-owner-code`).
- The session is **locked to that role**: the owner cannot switch roles, and staff cannot switch into it.
- The owner sees **only the AI Agent Workbench**: no client files and no audit log.

## 6. The document-chase agent: the slice's agentic workflow

Started from the composer ("**Run document-chase agent**", `POST /api/applications/{id}/chase-agent`). Fixed code controls the order of steps, and the two model calls happen inside it. Every step is recorded in an **AgentTrace** with its cost. The trace can be opened with "**View trace**" in the composer, and under "**Recent agent traces**" in the Workbench.

```
1. PLAN     tool: tracker   → read outstanding documents (stop if none)
2. ACT      tool: drafter   → draft from the approved template (items, due date, round, named RM)
3. REWRITE  LLM (guarded)   → reword in the chosen tone; on failure keep the template text
4. CRITIQUE LLM (guarded)   → score 1–5, verdict ok|revise, issues; never edits the text
5. REVISE   conditional     → one rewrite pass with the critic's issues, only if the verdict is "revise"
6. HAND-OFF human           → draft waits for the named RM; the agent CANNOT send or approve
```

### Trace steps recorded for every LLM task

| # | Step | What the trace shows |
|---|---|---|
| 1 | Feature flag | `FEATURE_AI_DRAFTING` is on; otherwise the task stops |
| 2 | Agent enabled | The config version in force (e.g. "config v3"); stops if the Credit Manager has switched the agent off |
| 3 | Budget | "spent $x of $y this month"; stops when the budget is used up |
| 4 | Rate limit | Under the per-user hourly limit (default 30 tasks) |
| 5 | Data minimisation | Which placeholders replaced client and contact names before the text left the server; keys stay server-side |
| 6 | Prompt assembled | Prompt version (or "unsaved prompt under test") and tone; the **exact system and user prompt** can be viewed; fixed guardrails appended |
| 7 | Primary call | Provider and model, input and output tokens, latency, USD and INR cost, a "simulated" flag, and the raw output; or the error and "trying fallback"; or "circuit breaker open" |
| 8 | Output validation | Pass, or rejected with the **exact missing detail** (e.g. `'Vikram Desai'`) or **forbidden phrase** (e.g. `'₹'`) |
| 9 | Fallback call | The same as step 7, for the second provider; then validated again |
| 10 | Restore names | Placeholders put back on the server |

**Fixed guardrails** appended on the server, which no UI edit can remove: plain text only; keep every numbered document line, the application ID, the due date, the RM's full name and every placeholder exactly as written; do not add amounts, interest rates, links, phone numbers, promises, or any statement about credit approval, rejection or eligibility. Validation also accepts the due date written in another common format (e.g. "20 November 2026").

## 7. Your AI questions, answered

### What is the cost of every call, in money, for the LLM to perform a single task?
- Every model call (each attempt) is an **AgentRun** row: provider, model, input and output tokens, **USD cost** from the price table, latency, status, config version, and a simulated flag.
- A task's cost is the sum of its attempts. A document-chase run's cost is the sum of all its tasks, shown on the trace in USD and INR.
- The "**Cost incurred until now**" table shows all-time and this-month totals, split by agent and by model, with **real** spend shown separately from **simulated**.

### Can I change the agent, and how quickly?
- Yes. The **AI Agent Owner** changes the prompt, tone, models, fallback and timeout. They can test an unsaved prompt first, then save it with a reason as a new version. Restoring any earlier version takes one click.
- The **Credit Manager** switches agents on or off and sets budgets and prices.
- **A change applies to the next call**, with no deploy or restart. The panel shows the change time, the first call made on the new version, and the seconds between them. In the seeded demo, the first call came 42 s after the switch.

### Worked example: one rewrite of about 600 input + 250 output tokens

Cost = input ÷ 1,000,000 × input price + output ÷ 1,000,000 × output price. Prices are USD per 1M tokens; INR uses the placeholder rate of ₹84 per US$1.

| Model | In $/1M | Out $/1M | Input | Output | Task USD | Task INR |
|---|---:|---:|---:|---:|---:|---:|
| Gemini `gemini-3.5-flash-lite` (default primary) | 0.30 | 2.50 | $0.000180 | $0.000625 | $0.000805 | ₹0.0676 |
| Gemini `gemini-3.1-flash-lite` (in catalogue; seeded demo switch) | 0.25 | 1.50 | $0.000150 | $0.000375 | $0.000525 | ₹0.0441 |
| Anthropic `claude-haiku-5-5` (default fallback) | 0.10 | 0.50 | $0.000060 | $0.000125 | $0.000185 | ₹0.0155 |

If the primary fails before returning usage, it costs $0 and the task costs only the fallback's amount: $0.000185 (₹0.0155) on Haiku 5.5. A primary output that is rejected after generation is still billed and counted. One **measured** real call, on `gemini-3.1-flash-lite` with 218 input + 96 output tokens, cost **$0.000199** (≈ ₹0.0167). Other catalogue models, such as `gemini-3.8-flash`, `claude-sonnet-5-5` and `claude-opus-5-5`, are available but cost more. Prices are as of 13 Nov 2026 and are placeholders until Finance confirms them.

### Security
- Model calls happen only on the backend. API keys come from the environment (Secret Manager on GCP), are never sent to the browser, and are never logged.
- Client and contact names are swapped for `[[CLIENT]]` and `[[CONTACT]]` before any call, and restored afterwards.
- Fixed guardrails are appended on the server; output validation names exactly what was dropped or added; output stays a **draft** needing the named RM's approval.
- Field-level access control on agent settings, and a separate, locked login for the AI Agent Owner.

### Primary and fallback models, different providers
- Default: **Gemini** `gemini-3.5-flash-lite` as primary and **Anthropic** `claude-haiku-5-5` as fallback, both lite models.
- The fallback runs automatically on an error, timeout, rate limit, refusal, empty answer, or **rejected output**.
- Circuit breaker: after 3 consecutive failures on a model within 10 minutes, that model is skipped. Each call has a timeout (default 20 s).
- A provider with no key falls back to the simulator only when `AI_DEMO_SIMULATE` is on, and every such result is labelled "simulated".

### Pricing: outcome-based and task-based
- **Token cost**: the actual provider spend.
- **Task-based price**: an internal chargeback per successful task. Placeholders are ₹2 per rewrite and ₹1 per critique.
- **Outcome-based price**: charged only when the AI-worded reminder is *approved and sent* by the RM. The placeholder is ₹5.
- All three are configurable by the Credit Manager and totalled side by side.

### Governance: trace each action and fix a single agent
- The cost ledger has one row per task, with expandable attempts. Every task and every document-chase run has a full trace.
- Each agent has its own settings. Every change is an **append-only config version** recording who, when, what and why, and every run records the version it used.
- Restoring a version takes one click and is itself a new version. The monthly budget cap blocks the agent when reached, and a per-user hourly rate limit applies.

### Backend agent API calls
- `POST /api/applications/{id}/chase-agent`: run the document-chase agent
- `POST /api/reminders/{id}/ai-reword` and `/critique`: single tasks
- `GET /api/agents`, `PATCH /api/agents/{key}` (field-level access), `POST /api/agents/{key}/restore`, `POST /api/agents/{key}/test`
- `GET /api/agent-runs` for the ledger, `GET /api/agent-traces` and `/{task_id}` for traces, `GET /api/rbac` for the matrix

### Scalability and stability
- Stateless on Cloud Run (0 to 2 instances, concurrency 80). Circuit state, budgets and rate limits are read from the database, so they hold across instances.
- Each call is bounded by its timeout, the fallback and the circuit breaker; cost is bounded by budget caps and rate limits.
- **Planned for production:** Azure India hosting, private endpoints, a job queue for scheduled sends, and a load test.

## 8. The UI for changing and testing agents

Two static mocks follow. The first is the agent governance panel as each role sees it. The second is the Workbench "Run an input" panel with its trace. Numbers are illustrative but are calculated from the real price table.

*Mock of the prototype screen: agent governance panel*

```
┌─ Reminder rewriter ─────────────────────────── [Enabled] [v3] ── (●) Agent on  [Credit Manager] ─┐
│ BEHAVIOUR: editable by the AI Agent Owner, greyed out for everyone else                          │
│   Primary   [Gemini ▾]    [gemini-3.1-flash-lite · $0.25/$1.50 ▾]                                │
│   Fallback  [Anthropic ▾] [claude-haiku-5-5 · $0.10/$0.50 ▾]                                     │
│   Tone [Formal ▾]   Timeout [20 s]   ( ○) Simulate primary outage: off                           │
│   Prompt: "You rewrite document reminders … Tone: {tone}."   (+ fixed guardrails on the server)   │
│ BUSINESS CONTROLS: editable by the Credit Manager, greyed out for everyone else                   │
│   Task price ₹[2.00]   Outcome price ₹[5.00]   Monthly budget $[25.00] · spent $0.000199          │
│ Reason for change (required): [Cost review: move primary to gemini-3.1-flash-lite]                │
│ [ Save as new version ]  [ Discard ]                                                              │
│ Last change: v3 by the AI Agent Owner. Live on the first call 42 s later, with no deploy.         │
│ Version history:                                                                                  │
│   v3 · primary_model · "Cost review…" · current                                                  │
│   v2 · tone · "Friendlier default for first reminders" · [Restore]                                │
│   v1 · created · "Initial configuration"                · [Restore]   (Restore: AI Agent Owner only) │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Cost incurred until now** (illustrative rows):

| Scope | Tasks (ok) | Calls | Tokens | LLM cost (all) | Real spend | Simulated calls | Task-based | Outcome-based |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| All time | 9 (8) | 11 | 8,140 | $0.001124 · ₹0.094 | $0.000398 | 7 | ₹13.00 | ₹5.00 |
| This month | 9 (8) | 11 | 8,140 | $0.001124 · ₹0.094 | $0.000398 | 7 | ₹13.00 | ₹5.00 |
| Rewriter | 5 (5) | 6 | 5,010 | $0.000802 | $0.000199 | 4 | ₹10.00 | ₹5.00 |
| Critic | 4 (3) | 5 | 3,130 | $0.000322 | $0.000199 | 3 | ₹3.00 | ₹0.00 |
| gemini/gemini-3.1-flash-lite | 3 | 4 | 1,730 | $0.000398 | $0.000398 | 0 | n/a | n/a |
| simulated/sim-standard | 6 | 7 | 6,410 | $0.000000 | $0.000000 | 7 | n/a | n/a |

*Mock of the prototype screen: Workbench "Run an input" with trace*

```
Agent [Reminder rewriter ▾]   Tone [Friendly ▾]
Prompt under test (unsaved): "You rewrite document reminders… Keep it warm and under 120 words. Tone: {tone}."
[ Run on synthetic sample ]  [ Reset to live prompt ]  [ Save prompt + tone as new version ]
```

| Trace step | Result | Detail |
|---|---|---|
| Feature flag | Pass | FEATURE_AI_DRAFTING is on |
| Agent enabled | Pass | config v3 |
| Budget | Pass | spent $0.000199 of $25.00 this month |
| Rate limit | Pass | under 30 tasks per user per hour |
| Data minimisation | Pass | sample already uses [[CLIENT]] / [[CONTACT]]; keys stay server-side |
| Prompt assembled | Info | unsaved prompt under test, tone friendly; guardrails appended · *View system + user prompt* |
| Primary call gemini/gemini-3.1-flash-lite | Pass | 218 in + 96 out tokens, 1,140 ms, $0.000199 (INR 0.0167) |
| Output validation | Pass | all 5 required details kept; no amounts, links, phone numbers or credit language |

Token and cost figures in this mock match the measured real call; the latency figure is illustrative. A rejected output shows, for example, "Output validation · Fail · rejected: dropped required detail(s): 'Sample RM'; trying fallback".

## 9. How we trace, evaluate and govern

| Capability | What it gives you | Status |
|---|---|---|
| AgentTrace for every task and document-chase run | Every guard step, the exact prompts, outputs, validation results and cost, viewable in the UI | **Built** |
| AgentRun ledger, one row per attempt | Provider, model, tokens, USD cost, latency, status, the error, `config_version`, and a simulated flag | **Built** |
| Cost incurred until now | All-time and this month, by agent and by model, real vs simulated, plus task-based and outcome-based charges | **Built** |
| Append-only config versions with one-click restore | Who, when, what and why, plus time from a change to the first call that used it | **Built** |
| Permission matrix shown in the UI | The same matrix the server enforces, visible to every role | **Built** |
| Hash-chained event log | Reminder drafted (including AI revisions), approved and sent; detectable if tampered with | **Built** |
| Critique scores, approval without edits, fallback share, rejection counts | Quality and stability signals per agent | **Built** |
| Prompt testing on synthetic sample text | Try an unsaved prompt and tone; output, trace and cost are shown before saving | **Built** |
| Offline eval set and regression gate | Rubric scored by the critic plus a human sample, run before any prompt or model change is promoted | Planned (pilot) |
| A/B testing by config version | Compare quality and cost per task | Planned (pilot) |
| Drift alerts; export to Azure Monitor / OpenTelemetry | Alerts on rejection rate, fallback rate and cost per task | Planned (production) |
| Quarterly model review; CIO/CISO approval gate | Price, quality and deprecation checks; mandatory before AI is used on real data | Planned (mandatory) |

## 10. What was verified live (13 Nov 2026)

| Check | Result |
|---|---|
| Real Gemini call | Pass. `gemini-3.1-flash-lite`: 218 input + 96 output tokens, **$0.000199**; passed output validation |
| Guardrail on a real output | Pass. A real Gemini output that dropped the RM's name was **rejected**, and the task fell back. The fallback ran the simulator because no Anthropic key was set, and it was labelled "simulated". |
| Real critic call | Pass. Returned a score of 5/5 |
| Backend tests (pytest) | 71 passed |
| Frontend unit tests (Vitest) | 8 passed |
| Browser tests (Playwright) | 4 passed, run against the live local server with real Gemini calls |
| Anthropic fallback with a real key | **Not yet.** No Anthropic key is set, so the fallback runs the simulator until one is added |

## 11. Open decisions and caveats

> **AI wording conflicts with the architecture document.** The document puts model-assisted wording out of the first release and requires that, if added, it runs inside Kestrel's Azure India tenancy with written CIO/CISO approval, with no customer data going to a public AI service. It was built here at the stakeholder's explicit request. It is off by default, uses synthetic data only, and must not be enabled on real data until that approval exists.

| Item | Status | Owner / next step |
|---|---|---|
| Anthropic fallback | **Simulated until a key is added** | Add `ANTHROPIC_API_KEY` (Secret Manager in GCP) and rerun the fallback drill |
| Overdue thresholds (due on the due date, overdue 2 calendar days after) | Assumption | Operations to confirm |
| Document list per product, applicant type and loan band | Placeholder | Credit to agree |
| Model prices, INR rate (84), task and outcome prices, budgets | Placeholder | Finance to confirm; the Credit Manager sets prices in the app |
| AI Agent Owner role | Prototype addition | Name a real owner (e.g. Operations or Data); map to an SSO group |
| GCP deployment | **Not run** | Needs the project ID, region and repository |
| Docker image | **Not built locally** | First build in CI |
| PostgreSQL path | **Not verified locally** | Verify in CI with a Postgres service |
| LOS, document store, mail, SSO | Stand-ins | Platform owners to confirm the interfaces |
| Event-log retention; owner of the template wording | Open | Compliance; Operations or Compliance |

**This prototype uses synthetic data only.** A production version must run in Kestrel's Azure India tenancy, not on GCP.

*Kestrel Document Tracker, first slice: prototype overview. Updated 13 Nov 2026.*
