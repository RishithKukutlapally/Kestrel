# Kestrel Document Tracker: demo guide

A click-by-click script for showing the prototype, plus a checklist of which controls are built.
Synthetic data only. No credit decisions anywhere.

## What the application does

When an SME client applies for a loan of up to ₹25 lakh, Kestrel needs documents from them:
bank statements, GST returns, financials and so on. Today, Relationship Managers (RMs) chase
these by e-mail from memory, ask more than once, and nobody can see what is blocking a file.

This prototype is the **first slice** of a fix:

1. **One shared checklist per application.** It is built from a rule table (product, applicant
   type, loan band) and shows each document as requested, received, overdue or waived.
2. **One reminder per round, approved by the RM.** The system drafts a reminder listing every
   missing document, the deadline and the RM's name. Only the RM named on the draft can approve
   and send it. Nothing is ever sent automatically.
3. **A document-chase AI agent** (optional) that prepares that reminder: it reads what is
   outstanding, drafts from the approved template, rewords it with an AI model, has a second AI
   check the wording, and hands it to the RM. It cannot send, approve, change the checklist or
   make any credit decision.
4. **Oversight and cost control**: an immutable, hash-chained audit log, counts without client
   data for the CRO, and per-call AI cost and model governance.

## Logins and roles

Open http://127.0.0.1:8000 and sign in as a person. **Username** = first name in lower case
(`vikram`, `sunita`, `meera`, ...). **Password** = first name plus the suffix set by
`DEMO_PASSWORD_TEMPLATE` in `.env` (your local list is in `LOGINS.local.md`, not in git).
There is no role switching: to show another role, **sign out** (click your name → Sign out) and
sign in as that person. Each person lands on their own screens.

| Username | Person | Role | Screens |
|---|---|---|---|
| vikram, priya, rohan, arjun | RMs | Relationship Manager | Queue (own files), Checklist, Reminder Composer |
| sunita | Sunita Rao | Credit Operations Coordinator | Full queue, Checklist, Composer (cannot approve) |
| ananya, karan | Analysts | Credit Analyst | Analyst File View, Checklist (read-only) |
| meera | Meera Kulkarni | Credit Manager | Oversight & Audit, AI business controls |
| rahul | Rahul Bhatia | CRO Oversight | Oversight & Audit, read-only |
| kavya | Kavya Menon | CFO Office (Finance) | AI Cost & Governance, read-only |
| dev | Dev Raman | AI Agent Owner | AI Agent Workbench |

## Demo script (about 12 minutes)

**1. The queue (Sunita Rao, coordinator), 1 minute.**
Sign in as **sunita**. Show the summary strip (computed on the server), status chips with
text and colour, sorting by oldest outstanding item, and filters. Point out the banner
"Prototype. Synthetic data only."

**2. A file's checklist (Sunita), 2 minutes.**
Click KF-2026-1049. Show the grouped documents, request rounds, "What is blocking this file",
and the timeline. Click **Mark Received** on one item, then **Waive Item** on another: the
waiver refuses an empty reason. Both appear at the top of the timeline.

**3. The document-chase agent (Vikram Desai, RM), 3 minutes.**
Sign out → sign in as **vikram** → Reminder Composer → KF-2026-1203 (or any file of his) →
**Run document-chase agent** → **View trace**. Walk through the steps:
- *Plan*: read the outstanding documents from the tracker.
- *Act*: draft from the approved template.
- *Rewriter*: feature flag, agent enabled, budget, rate limit, **names redacted** before the model
  call, the **exact prompt** (open "Show exact prompt sent"), the **model call** with tokens,
  latency and **cost in $ and ₹**, and **output validation** (required details kept, no amounts,
  links, phone numbers or credit language).
- *Critic*: a second model call scores the draft.
- *Hand-off*: held for Vikram. The agent cannot send.
Then show the draft labelled **"Draft for RM review (not sent)"** and approve it with
**Approve and Send Now**. Sign in as **sunita** and open a draft: she cannot. The server
refuses even if the button were shown.

**4. Analyst view (Ananya Sengupta), 1 minute.**
Sign in as **ananya** → Analyst File View. A file shows **Blocked** with its blocking items. Send
**Request to RM**: it appears on the RM's queue and in the checklist.

**5. AI Agent Owner: change the agent, 3 minutes.**
Sign in as **dev** (AI Agent Owner). He sees only the Workbench.
- Edit the prompt, choose a tone, **Run with this prompt**: output plus the full trace and its cost.
- **Save prompt + tone as new version** (a reason is required).
- In the Reminder rewriter card, change the primary model, add a reason, **Save**. It is
  live on the next call, with no deploy. Open **Version history** and **Restore** an older version.
- Tick **Drill: simulate primary outage**, save, sign in as **vikram**, and reword a draft. The
  trace shows the primary failing and the **fallback model** serving the task. Untick afterwards.

**6. Cost so far and governance, 2 minutes.**
- Sign in as **kavya** (CFO Office): **Cost incurred until now** (all-time, this
  month, real versus simulated, by agent, by model, task-based and outcome-based charges) and
  the per-task cost ledger. Read-only.
- Sign in as **meera**: Oversight counts with no client names, the hash-chain check, and the
  searchable audit log. In AI governance she can switch an agent off, set a budget or set prices,
  but cannot edit prompts.
- Click your name → **Show access-control matrix**: every permission and every role.

## Is it implemented? Status checklist

✅ built and tested · ⚠️ built with a limitation · ❌ not built in this prototype

| Area | Control | Status |
|---|---|---|
| **Access** | Access code gate; signed, HttpOnly, SameSite=Lax cookie (Secure on HTTPS) | ✅ |
| | Personal login per person (username + PBKDF2-hashed password); no role switching | ✅ |
| | Login throttling after repeated failures | ✅ |
| | Real single sign-on (Azure AD) | ❌ demo passwords instead |
| **RBAC** | One permission matrix checked on every API call, with own/assigned/all scopes | ✅ |
| | Field-level rights on agent config (Credit Manager vs AI Agent Owner) | ✅ |
| | Matrix visible in the app | ✅ |
| **Business rules** | Only the named RM can approve or send; enforced on the server | ✅ |
| | Drafts never send automatically; scheduled sends need prior approval | ✅ |
| | Waiver needs a reason; overdue derived from configurable thresholds | ✅ |
| | No credit decision, no credit data, no LOS writes | ✅ |
| **Audit** | Every change is an immutable event; DB triggers block UPDATE/DELETE | ✅ |
| | SHA-256 hash chain, verified on screen | ✅ |
| **AI security** | Keys server-side only, never logged or sent to the browser | ✅ |
| | Client and contact names redacted before any model call | ✅ |
| | Fixed guardrails appended to every prompt; prompt edits cannot remove them | ✅ |
| | Output validation (required facts kept; amounts, links, phones, credit words blocked) | ✅ |
| | AI output is always a draft for the named RM | ✅ |
| **AI resilience** | Primary → fallback model, per-call timeout, circuit breaker | ✅ |
| | Fallback on a **different provider** | ⚠️ Gemini only (no Anthropic key), so the fallback is a second Gemini model; one click switches it to Claude once a key exists |
| **AI cost** | Cost of every call (tokens, USD/INR, latency) and of every task | ✅ |
| | Cost incurred until now: all-time, month, by agent, by model, real vs simulated | ✅ |
| | Task-based and outcome-based pricing (placeholder ₹ values) | ✅ |
| | Monthly budget cap per agent; per-user hourly rate limit | ✅ |
| **AI governance** | Change model/prompt/tone live on the next call; reason recorded | ✅ |
| | Append-only version history; one-click restore | ✅ |
| | Test a prompt on synthetic input before saving | ✅ |
| | Step-by-step trace of every agent run | ✅ |
| | Critic agent review | ✅ |
| | Offline evaluation set and drift alerts | ❌ planned (see overview) |
| **Deployment** | Vercel (Python function + Neon Postgres); CI tests on GitHub | ✅ configured |
| | Production in Kestrel's Azure India tenancy | ❌ by design; the prototype runs on Vercel |

## Honest caveats

- The architecture document keeps AI wording **out of the first release**, and requires it to run
  in the Azure India tenancy with CIO/CISO approval. The AI features here were built at the
  sponsor's request and are deployed **off** by default.
- Prices, the ₹84/USD rate, overdue thresholds and the document list are placeholders for
  Finance, Operations and Credit to confirm.
- E-mail sending is simulated. No real client is ever contacted.
