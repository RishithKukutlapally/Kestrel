"""AI agent governance: routing with fallback, per-call costing, budgets, config versions.

Two agents, both limited to reminder wording (no credit content, no decisions):
  reminder_rewriter  rewords a draft in a chosen tone; result stays a draft for RM approval
  reminder_critic    reviews a draft and lists issues; never changes the text

Every model call is one AgentRun row with provider, model, tokens, USD cost and latency.
Answering "what did this task cost?" = sum of the rows with the same task_id.
Answering "how quickly can I change the agent?" = config change is live on the next call;
we record the change time and the first call that used the new version.
"""

from __future__ import annotations

import json
import re
import time
import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai import providers
from app.config import get_settings
from app.domain.roles import Conflict, Forbidden, Invalid
from app.models import (
    AGENT_KEYS,
    PROVIDERS,
    AgentConfig,
    AgentConfigVersion,
    AgentRun,
    AgentTrace,
    ModelPrice,
    Staff,
)

TONES = ("formal", "friendly", "firm", "concise")

# Fixed guardrails appended to every prompt. Editing the prompt in the UI cannot remove them.
GUARDRAILS = (
    "\n\nNon-negotiable rules: plain text only. Keep every numbered document line, the "
    "application ID, the due date, the Relationship Manager's full name, and every placeholder "
    "in double square brackets exactly "
    "as written. Do not add amounts, interest rates, links, phone numbers, promises, or any "
    "statement about credit approval, rejection or eligibility. Return only the message."
)
CRITIC_FORMAT = (
    '\n\nReturn JSON only: {"score": 1-5, "verdict": "ok" or "revise", "issues": [short strings]}'
)

DEFAULTS: dict[str, dict[str, Any]] = {
    "reminder_rewriter": {
        "display_name": "Reminder rewriter",
        "description": "Rewords a reminder draft in the chosen tone. Output stays a draft "
        "until the named RM approves it.",
        "tone": "formal",
        "prompt": "You rewrite document reminders from an Indian SME lender to its small-"
        "business clients so they are clear, courteous and short.\nTone: {tone}.",
        "task_price_inr": 2.0,
        "outcome_price_inr": 5.0,
        "monthly_budget_usd": 25.0,
    },
    "reminder_critic": {
        "display_name": "Reminder critic",
        "description": "Reviews a draft for clarity, tone and forbidden content and lists "
        "issues for the RM. Never edits the text.",
        "tone": "formal",
        "prompt": "You review document reminders from an Indian SME lender before a "
        "Relationship Manager approves them. Check clarity, politeness and that nothing "
        "beyond the document request is promised. Expected tone: {tone}.",
        "task_price_inr": 1.0,
        "outcome_price_inr": 0.0,
        "monthly_budget_usd": 10.0,
    },
}

# Placeholder/confirmed prices, USD per 1M tokens. Source and date shown in the UI.
PRICES = [
    ("gemini", "gemini-3.8-flash", 0.75, 3.75, "ai.google.dev pricing (rises 2027-01-01)"),
    ("gemini", "gemini-3.5-flash-lite", 0.30, 2.50, "ai.google.dev pricing"),
    ("gemini", "gemini-3.1-flash-lite", 0.25, 1.50, "ai.google.dev pricing"),
    ("anthropic", "claude-opus-5-5", 4.00, 20.00, "Anthropic API pricing"),
    ("anthropic", "claude-sonnet-5-5", 2.00, 10.00, "Anthropic API pricing"),
    ("anthropic", "claude-haiku-5-5", 0.10, 0.50, "Anthropic API pricing"),
    ("simulated", "sim-standard", 0.0, 0.0, "local simulator, no charge"),
]

BANNED = re.compile(
    r"(₹|rs\.?\s?\d|\binterest\b|\bsanction|\bapprov(ed|al) of (your|the) loan|\breject|"
    r"\beligib|https?://|www\.|\+91|\b\d{10}\b)",
    re.IGNORECASE,
)

CIRCUIT_FAILURES = 3
CIRCUIT_WINDOW = timedelta(minutes=10)


# ---------------------------------------------------------------------------- setup
def ensure_defaults(session: Session, *, now: datetime, actor: str = "System setup") -> None:
    s = get_settings()
    if not session.scalar(select(func.count(ModelPrice.id))):
        for provider, model, pin, pout, src in PRICES:
            session.add(
                ModelPrice(
                    provider=provider,
                    model=model,
                    input_usd_per_mtok=pin,
                    output_usd_per_mtok=pout,
                    source=src,
                    as_of=now.date(),
                )
            )
    for key in AGENT_KEYS:
        if session.get(AgentConfig, key):
            continue
        d = DEFAULTS[key]
        cfg = AgentConfig(
            agent_key=key,
            enabled=True,
            primary_provider="gemini",
            primary_model=s.gemini_model,
            # Fallback on a second provider when its key exists; otherwise a second Gemini model.
            fallback_provider="anthropic" if s.anthropic_api_key else "gemini",
            fallback_model=s.anthropic_model if s.anthropic_api_key else s.gemini_fallback_model,
            timeout_seconds=20,
            simulate_primary_outage=False,
            version=1,
            updated_by=actor,
            updated_at=now,
            **d,
        )
        session.add(cfg)
        session.flush()
        session.add(
            AgentConfigVersion(
                agent_key=key,
                version=1,
                snapshot=_snapshot(cfg),
                changed_fields=["created"],
                note="Initial configuration",
                changed_by=actor,
                changed_at=now,
            )
        )
    session.flush()


def _snapshot(cfg: AgentConfig) -> dict[str, Any]:
    return {c: getattr(cfg, c) for c in EDITABLE}


EDITABLE = (
    "enabled",
    "primary_provider",
    "primary_model",
    "fallback_provider",
    "fallback_model",
    "tone",
    "prompt",
    "task_price_inr",
    "outcome_price_inr",
    "monthly_budget_usd",
    "timeout_seconds",
    "simulate_primary_outage",
)


def model_catalogue(session: Session) -> dict[str, list[str]]:
    cat: dict[str, list[str]] = {p: [] for p in PROVIDERS}
    for mp in session.scalars(select(ModelPrice).order_by(ModelPrice.id)):
        cat.setdefault(mp.provider, []).append(mp.model)
    return cat


# ---------------------------------------------------------------------------- config changes
def update_config(
    session: Session,
    key: str,
    changes: dict[str, Any],
    *,
    note: str,
    actor: Staff,
    now: datetime,
    allowed: set[str] | None = None,
) -> AgentConfig:
    """Apply a change as a new version. `allowed` = fields this actor may change (RBAC)."""
    cfg = session.get(AgentConfig, key)
    if cfg is None:
        raise Invalid("unknown agent")
    if not note.strip():
        raise Invalid("record why you are changing the agent")
    cat = model_catalogue(session)
    changed = []
    for field, value in changes.items():
        if field not in EDITABLE:
            raise Invalid(f"{field} cannot be changed")
        if value is None or getattr(cfg, field) == value:
            continue
        if allowed is not None and field not in allowed:
            raise Forbidden(f"your role cannot change '{field}'")
        setattr(cfg, field, value)
        changed.append(field)
    for route in ("primary", "fallback"):
        prov, model = getattr(cfg, f"{route}_provider"), getattr(cfg, f"{route}_model")
        if prov not in PROVIDERS or model not in cat.get(prov, []):
            raise Invalid(f"{route}: {prov}/{model} is not in the priced model list")
    if cfg.tone not in TONES:
        raise Invalid("unknown tone")
    if not 50 <= len(cfg.prompt) <= 4000:
        raise Invalid("prompt must be 50 to 4000 characters")
    if cfg.monthly_budget_usd < 0 or cfg.task_price_inr < 0 or cfg.outcome_price_inr < 0:
        raise Invalid("prices and budgets cannot be negative")
    if not changed:
        raise Conflict("nothing changed")
    cfg.version += 1
    cfg.updated_by = actor.name
    cfg.updated_at = now
    session.add(
        AgentConfigVersion(
            agent_key=key,
            version=cfg.version,
            snapshot=_snapshot(cfg),
            changed_fields=changed,
            note=note.strip(),
            changed_by=actor.name,
            changed_at=now,
        )
    )
    session.flush()
    return cfg


# ---------------------------------------------------------------------------- running a task
def _price(session: Session, provider: str, model: str) -> tuple[float, float]:
    mp = session.scalar(
        select(ModelPrice).where(ModelPrice.provider == provider, ModelPrice.model == model)
    )
    return (mp.input_usd_per_mtok, mp.output_usd_per_mtok) if mp else (0.0, 0.0)


def _month_spend(session: Session, key: str, now: datetime) -> float:
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return float(
        session.scalar(
            select(func.coalesce(func.sum(AgentRun.cost_usd), 0.0)).where(
                AgentRun.agent_key == key, AgentRun.created_at >= start
            )
        )
        or 0.0
    )


def circuit_open(session: Session, provider: str, model: str, now: datetime) -> bool:
    """Open when the last N calls to this provider/model in the window all failed."""
    recent = session.scalars(
        select(AgentRun.status)
        .where(
            AgentRun.provider == provider,
            AgentRun.model == model,
            AgentRun.created_at >= now - CIRCUIT_WINDOW,
            AgentRun.status.in_(["ok", "error"]),
        )
        .order_by(AgentRun.id.desc())
        .limit(CIRCUIT_FAILURES)
    ).all()
    return len(recent) == CIRCUIT_FAILURES and all(s == "error" for s in recent)


def _rate_limited(session: Session, actor: Staff, now: datetime) -> bool:
    n = session.scalar(
        select(func.count(func.distinct(AgentRun.task_id))).where(
            AgentRun.triggered_by == actor.name, AgentRun.created_at >= now - timedelta(hours=1)
        )
    )
    return (n or 0) >= get_settings().ai_tasks_per_user_per_hour


def redact(text: str, secrets: dict[str, str]) -> str:
    """Data minimisation: replace names with placeholders before text leaves the server."""
    for placeholder, value in secrets.items():
        if value:
            text = text.replace(value, placeholder)
    return text


def restore(text: str, secrets: dict[str, str]) -> str:
    for placeholder, value in secrets.items():
        text = text.replace(placeholder, value)
    return text


class AgentUnavailable(Exception):
    pass


Step = dict[str, Any]


def _step(trace: list[Step] | None, name: str, status: str, detail: str, **data: Any) -> None:
    """Append one human-readable step to a trace (status: pass | fail | info | skip)."""
    if trace is not None:
        trace.append({"step": name, "status": status, "detail": detail, "data": data or None})


def run_task(
    session: Session,
    *,
    agent_key: str,
    task: str,
    text: str,
    tone: str | None,
    must_keep: list[str],
    secrets: dict[str, str],
    application_id: str | None,
    reminder_id: int | None,
    actor: Staff,
    now: datetime | None = None,
    prompt_override: str | None = None,
    extra_instruction: str | None = None,
    trace: list[Step] | None = None,
) -> tuple[str, list[AgentRun]]:
    """Run one task through primary then fallback. Returns (output, attempt rows).

    Every check and call is appended to `trace` and stored as an AgentTrace row.
    """
    s = get_settings()
    now = now or datetime.now(UTC)
    steps: list[Step] = [] if trace is None else trace
    first = len(steps)
    label = f"{DEFAULTS[agent_key]['display_name']}: "

    def fail(msg: str) -> AgentUnavailable:
        _step(steps, label + "stopped", "fail", msg)
        return AgentUnavailable(msg)

    if not s.ai_drafting_enabled:
        raise fail("AI drafting disabled (FEATURE_AI_DRAFTING is off)")
    _step(steps, label + "feature flag", "pass", "FEATURE_AI_DRAFTING is on")
    cfg = session.get(AgentConfig, agent_key)
    if cfg is None or not cfg.enabled:
        raise fail(f"{agent_key} is switched off by the Credit Manager")
    _step(steps, label + "agent enabled", "pass", f"config v{cfg.version}")
    spent = _month_spend(session, agent_key, now)
    if spent >= cfg.monthly_budget_usd:
        raise fail(f"monthly budget used up (${spent:.4f} of ${cfg.monthly_budget_usd:.2f})")
    _step(
        steps,
        label + "budget",
        "pass",
        f"spent ${spent:.6f} of ${cfg.monthly_budget_usd:.2f} this month",
    )
    if _rate_limited(session, actor, now):
        raise fail("too many AI requests in the last hour; try later")
    _step(
        steps,
        label + "rate limit",
        "pass",
        f"under {s.ai_tasks_per_user_per_hour} tasks per user per hour",
    )
    tone = tone or cfg.tone
    if tone not in TONES:
        raise Invalid("unknown tone")

    system = (prompt_override or cfg.prompt).replace("{tone}", tone)
    if extra_instruction:
        system += "\n\nAlso address these review points: " + extra_instruction
    system += CRITIC_FORMAT if task == "critique" else GUARDRAILS
    if "Tone:" not in system:
        system = f"Tone: {tone}.\n" + system
    payload = redact(text, secrets)
    replaced = [k for k, v in secrets.items() if v and v in text]
    _step(
        steps,
        label + "data minimisation",
        "pass",
        f"replaced {', '.join(replaced) or 'nothing'} before the text leaves the server; "
        "API keys stay server-side and are never logged",
    )
    verb = "review" if task == "critique" else "rewrite"
    prompt = f"Message to {verb}:\n---\n" + payload
    keep = [redact(k, secrets) for k in must_keep]
    _step(
        steps,
        label + "prompt assembled",
        "info",
        ("unsaved prompt under test" if prompt_override else f"prompt v{cfg.version}")
        + f", tone {tone}; fixed guardrails appended (cannot be edited)",
        system=system,
        user=prompt,
    )

    task_id = str(uuid.uuid4())
    runs: list[AgentRun] = []
    routes = [
        ("primary", cfg.primary_provider, cfg.primary_model),
        ("fallback", cfg.fallback_provider, cfg.fallback_model),
    ]
    out: str | None = None
    for attempt, (route, provider, model) in enumerate(routes, start=1):
        tripped = circuit_open(session, provider, model, now)
        run = AgentRun(
            task_id=task_id,
            agent_key=agent_key,
            config_version=cfg.version,
            task=task,
            application_id=application_id,
            reminder_id=reminder_id,
            triggered_by=actor.name,
            attempt=attempt,
            route=route,
            provider=provider,
            model=model,
            tone=tone,
            created_at=now,
            status="error",
            outcome="pending",
        )
        runs.append(run)
        session.add(run)
        name = f"{label}{route} call {provider}/{model}"
        if tripped:
            run.status, run.error = "skipped_circuit_open", "provider failing; skipped"
            _step(steps, name, "skip", "circuit breaker open (3 recent failures); skipped")
            continue
        started = time.perf_counter()
        try:
            if route == "primary" and cfg.simulate_primary_outage:
                raise providers.ProviderError("simulated outage (drill switch on)")
            res = providers.call(provider, model, system, prompt, cfg.timeout_seconds)
        except providers.ProviderError as exc:
            run.latency_ms = int((time.perf_counter() - started) * 1000)
            run.error = str(exc)[:200]
            nxt = "; trying fallback" if route == "primary" else ""
            _step(steps, name, "fail", f"{run.error}; {run.latency_ms} ms{nxt}")
            continue
        run.latency_ms = int((time.perf_counter() - started) * 1000)
        pin, pout = _price(session, provider, model)
        run.input_tokens, run.output_tokens = res.input_tokens, res.output_tokens
        run.cost_usd = round(res.input_tokens / 1e6 * pin + res.output_tokens / 1e6 * pout, 8)
        run.simulated = res.simulated
        sim = " [simulated, no real charge]" if res.simulated else ""
        _step(
            steps,
            name,
            "pass",
            f"{res.input_tokens} in + {res.output_tokens} out tokens, {run.latency_ms} ms, "
            f"${run.cost_usd:.6f} (INR {run.cost_usd * s.usd_inr_rate:.4f}){sim}",
            output=res.text[:4000],
        )
        problem = _validate(task, res.text, keep)
        if problem:
            run.status, run.error = "rejected", problem
            nxt = "; trying fallback" if route == "primary" else ""
            _step(steps, label + "output validation", "fail", f"rejected: {problem}{nxt}")
            continue
        _step(
            steps,
            label + "output validation",
            "pass",
            "valid JSON review"
            if task == "critique"
            else f"all {len(keep)} required details kept; no amounts, links, phone numbers "
            "or credit language",
        )
        run.status = "ok"
        out = restore(res.text, secrets)
        run.summary = out[:2000] if (task == "critique" or application_id is None) else None
        if replaced:
            _step(steps, label + "restore names", "info", "placeholders put back on the server")
        break
    cost = sum(r.cost_usd for r in runs)
    session.add(
        AgentTrace(
            task_id=task_id,
            kind="task",
            agent_key=agent_key,
            application_id=application_id,
            triggered_by=actor.name,
            created_at=now,
            steps=steps[first:],
            total_cost_usd=round(cost, 8),
            status="ok" if out is not None else "failed",
        )
    )
    session.flush()
    if out is None:
        raise fail("both primary and fallback failed; the text is unchanged")
    return out, runs


def _validate(task: str, text: str, keep: list[str]) -> str | None:
    if task == "critique":
        try:
            data = json.loads(text[text.find("{") : text.rfind("}") + 1])
            assert isinstance(data.get("issues"), list) and 1 <= int(data["score"]) <= 5
        except Exception:
            return "critique was not valid JSON"
        return None
    missing = [k for k in keep if not _kept(k, text)]
    if missing:
        return "dropped required detail(s): " + "; ".join(f"'{m}'" for m in missing)
    hit = BANNED.search(text)
    if hit:
        return (
            "added forbidden content (amounts, links, phone numbers or credit language): "
            f"'{hit.group(0)}'"
        )
    return None


_DATE = re.compile(r"^(?:[A-Za-z]+, )?(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$")


def _kept(required: str, text: str) -> bool:
    """Exact match, or for a due date the same date written another common way."""
    if required in text:
        return True
    m = _DATE.match(required)
    if not m:
        return False
    day, mon, year = int(m.group(1)), m.group(2).lower(), m.group(3)
    pattern = (
        rf"(?:\b0?{day}(?:st|nd|rd|th)?\s+{mon}[a-z]*\.?,?\s+{year}\b)"
        rf"|(?:\b{mon}[a-z]*\.?\s+0?{day}(?:st|nd|rd|th)?,?\s+{year}\b)"
    )
    return re.search(pattern, text, re.IGNORECASE) is not None


def mark_outcome_accepted(session: Session, reminder_id: int) -> None:
    """Outcome-based pricing: the latest successful rewrite counts once the reminder is sent."""
    run = session.scalar(
        select(AgentRun)
        .where(
            AgentRun.reminder_id == reminder_id,
            AgentRun.agent_key == "reminder_rewriter",
            AgentRun.status == "ok",
        )
        .order_by(AgentRun.id.desc())
        .limit(1)
    )
    if run is not None:
        run.outcome = "accepted"


# ---------------------------------------------------------------------------- reporting
def task_view(runs: list[AgentRun], usd_inr: float, cfg: AgentConfig) -> dict[str, Any]:
    ok = next((r for r in runs if r.status == "ok"), None)
    cost = sum(r.cost_usd for r in runs)
    return {
        "task_id": runs[0].task_id,
        "agent_key": runs[0].agent_key,
        "task": runs[0].task,
        "config_version": runs[0].config_version,
        "application_id": runs[0].application_id,
        "triggered_by": runs[0].triggered_by,
        "created_at": runs[0].created_at.isoformat(),
        "status": "ok" if ok else "failed",
        "served_by": f"{ok.provider}/{ok.model}" if ok else None,
        "used_fallback": bool(ok and ok.route == "fallback"),
        "simulated": any(r.simulated for r in runs),
        "tone": runs[0].tone,
        "attempts": [
            {
                "attempt": r.attempt,
                "route": r.route,
                "provider": r.provider,
                "model": r.model,
                "status": r.status,
                "error": r.error,
                "input_tokens": r.input_tokens,
                "output_tokens": r.output_tokens,
                "cost_usd": r.cost_usd,
                "latency_ms": r.latency_ms,
                "simulated": r.simulated,
            }
            for r in runs
        ],
        "tokens": sum(r.input_tokens + r.output_tokens for r in runs),
        "llm_cost_usd": round(cost, 6),
        "llm_cost_inr": round(cost * usd_inr, 4),
        "task_price_inr": cfg.task_price_inr if ok else 0.0,
        "outcome": ok.outcome if ok else "n/a",
        "outcome_price_inr": cfg.outcome_price_inr if ok and ok.outcome == "accepted" else 0.0,
        "summary": ok.summary if ok else None,
    }


def ledger(
    session: Session,
    *,
    agent: str | None = None,
    application_id: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    q = select(AgentRun).order_by(AgentRun.id.desc())
    if agent:
        q = q.where(AgentRun.agent_key == agent)
    if application_id:
        q = q.where(AgentRun.application_id == application_id)
    rows = session.scalars(q.limit(limit * 3)).all()
    grouped: dict[str, list[AgentRun]] = {}
    for r in rows:
        grouped.setdefault(r.task_id, []).append(r)
    cfgs = {c.agent_key: c for c in session.scalars(select(AgentConfig))}
    rate = get_settings().usd_inr_rate
    out = []
    for runs in list(grouped.values())[:limit]:
        runs.sort(key=lambda r: r.attempt)
        out.append(task_view(runs, rate, cfgs[runs[0].agent_key]))
    return out


def governance(session: Session, *, now: datetime) -> dict[str, Any]:
    s = get_settings()
    rate = s.usd_inr_rate
    agents = []
    for cfg in session.scalars(select(AgentConfig).order_by(AgentConfig.agent_key)):
        runs = session.scalars(select(AgentRun).where(AgentRun.agent_key == cfg.agent_key)).all()
        tasks: dict[str, list[AgentRun]] = {}
        for r in runs:
            tasks.setdefault(r.task_id, []).append(r)
        ok_tasks = [t for t in tasks.values() if any(r.status == "ok" for r in t)]
        fallback_tasks = [
            t for t in ok_tasks if any(r.status == "ok" and r.route == "fallback" for r in t)
        ]
        llm_total = sum(r.cost_usd for r in runs)
        accepted = sum(1 for r in runs if r.outcome == "accepted")
        versions = session.scalars(
            select(AgentConfigVersion)
            .where(AgentConfigVersion.agent_key == cfg.agent_key)
            .order_by(AgentConfigVersion.version.desc())
        ).all()
        last = versions[0] if versions else None
        first_after = None
        if last is not None:
            first_after = session.scalar(
                select(AgentRun)
                .where(AgentRun.agent_key == cfg.agent_key, AgentRun.config_version >= last.version)
                .order_by(AgentRun.id)
                .limit(1)
            )
        by_model = Counter(f"{r.provider}/{r.model}" for r in runs if r.status == "ok")
        agents.append(
            {
                "agent_key": cfg.agent_key,
                "display_name": cfg.display_name,
                "description": cfg.description,
                "config": {f: getattr(cfg, f) for f in EDITABLE},
                "version": cfg.version,
                "updated_by": cfg.updated_by,
                "updated_at": cfg.updated_at.isoformat(),
                "circuit": {
                    "primary_open": circuit_open(
                        session, cfg.primary_provider, cfg.primary_model, now
                    ),
                    "fallback_open": circuit_open(
                        session, cfg.fallback_provider, cfg.fallback_model, now
                    ),
                },
                "tasks_total": len(tasks),
                "tasks_ok": len(ok_tasks),
                "fallback_share_pct": round(100 * len(fallback_tasks) / len(ok_tasks), 1)
                if ok_tasks
                else 0.0,
                "served_by": dict(by_model),
                "llm_cost_usd_total": round(llm_total, 6),
                "llm_cost_usd_per_task": round(llm_total / len(tasks), 6) if tasks else 0.0,
                "llm_cost_inr_per_task": round(llm_total / len(tasks) * rate, 4) if tasks else 0.0,
                "month_spend_usd": round(_month_spend(session, cfg.agent_key, now), 6),
                "task_based_charge_inr": round(len(ok_tasks) * cfg.task_price_inr, 2),
                "outcome_based_charge_inr": round(accepted * cfg.outcome_price_inr, 2),
                "outcomes_accepted": accepted,
                "last_change": {
                    "version": last.version,
                    "fields": last.changed_fields,
                    "note": last.note,
                    "by": last.changed_by,
                    "at": last.changed_at.isoformat(),
                    "first_call_at": first_after.created_at.isoformat() if first_after else None,
                    "seconds_to_first_call": round(
                        (first_after.created_at - last.changed_at).total_seconds(), 1
                    )
                    if first_after
                    else None,
                }
                if last
                else None,
                "versions": [
                    {
                        "version": v.version,
                        "fields": v.changed_fields,
                        "note": v.note,
                        "by": v.changed_by,
                        "at": v.changed_at.isoformat(),
                        "prompt": v.snapshot.get("prompt"),
                        "tone": v.snapshot.get("tone"),
                        "primary": "{}/{}".format(
                            v.snapshot.get("primary_provider"), v.snapshot.get("primary_model")
                        ),
                        "fallback": "{}/{}".format(
                            v.snapshot.get("fallback_provider"), v.snapshot.get("fallback_model")
                        ),
                    }
                    for v in versions[:10]
                ],
            }
        )
    prices = [
        {
            "provider": p.provider,
            "model": p.model,
            "input": p.input_usd_per_mtok,
            "output": p.output_usd_per_mtok,
            "source": p.source,
            "as_of": p.as_of.isoformat(),
        }
        for p in session.scalars(select(ModelPrice).order_by(ModelPrice.id))
    ]
    return {
        "enabled": s.ai_drafting_enabled,
        "simulated_mode": s.ai_demo_simulate,
        "keys": {
            "gemini": s.gemini_api_key is not None,
            "anthropic": s.anthropic_api_key is not None,
        },
        "usd_inr_rate": rate,
        "tones": list(TONES),
        "catalogue": model_catalogue(session),
        "prices": prices,
        "agents": agents,
    }


BEHAVIOUR_FIELDS = (
    "prompt",
    "tone",
    "primary_provider",
    "primary_model",
    "fallback_provider",
    "fallback_model",
    "timeout_seconds",
    "simulate_primary_outage",
)


def restore_version(
    session: Session,
    key: str,
    version: int,
    *,
    note: str,
    actor: Staff,
    now: datetime,
    allowed: set[str],
) -> AgentConfig:
    """Roll back the fields this actor owns to an earlier version (itself a new version)."""
    v = session.scalar(
        select(AgentConfigVersion).where(
            AgentConfigVersion.agent_key == key, AgentConfigVersion.version == version
        )
    )
    if v is None:
        raise Invalid("unknown version")
    changes = {f: v.snapshot[f] for f in allowed if f in v.snapshot}
    return update_config(
        session,
        key,
        changes,
        note=note or f"Restore v{version}",
        actor=actor,
        now=now,
        allowed=allowed,
    )


SAMPLE_REMINDER = "\n".join(
    [
        "Dear [[CONTACT]],",
        "",
        "Regarding your application KF-2026-0000 for [[CLIENT]]:",
        "",
        "To continue with your application, we need the following documents:",
        "",
        "1. Current account statement (last 12 months)",
        "2. GSTR-3B returns (last 6 months)",
        "",
        "Please share these documents by Friday, 20 Nov 2026.",
        "",
        "If you have any questions, please contact your Relationship Manager, Sample RM.",
        "",
        "Kestrel Finance, SME Lending",
    ]
)
SAMPLE_KEEP = [
    "Current account statement (last 12 months)",
    "GSTR-3B returns (last 6 months)",
    "KF-2026-0000",
    "Friday, 20 Nov 2026",
    "Sample RM",
]


def test_prompt(
    session: Session, key: str, *, prompt: str | None, tone: str | None, actor: Staff, now: datetime
) -> tuple[str, list[AgentRun]]:
    """Run an agent (optionally with an unsaved prompt) on a synthetic sample. Costed + logged."""
    if prompt is not None and not 50 <= len(prompt) <= 4000:
        raise Invalid("prompt must be 50 to 4000 characters")
    return run_task(
        session,
        agent_key=key,
        task="critique" if key == "reminder_critic" else "reword",
        text=SAMPLE_REMINDER,
        tone=tone,
        must_keep=SAMPLE_KEEP,
        secrets={},
        application_id=None,
        reminder_id=None,
        actor=actor,
        now=now,
        prompt_override=prompt,
    )


# ---------------------------------------------------------------------------- traces & totals
def trace_view(session: Session, task_id: str) -> dict[str, Any] | None:
    t = session.get(AgentTrace, task_id)
    if t is None:
        return None
    rate = get_settings().usd_inr_rate
    return {
        "task_id": t.task_id,
        "kind": t.kind,
        "agent_key": t.agent_key,
        "application_id": t.application_id,
        "triggered_by": t.triggered_by,
        "created_at": t.created_at.isoformat(),
        "status": t.status,
        "total_cost_usd": t.total_cost_usd,
        "total_cost_inr": round(t.total_cost_usd * rate, 4),
        "steps": t.steps,
    }


def traces(session: Session, *, application_id: str | None, limit: int) -> list[dict[str, Any]]:
    q = select(AgentTrace).order_by(AgentTrace.created_at.desc())
    if application_id:
        q = q.where(AgentTrace.application_id == application_id)
    out = []
    for t in session.scalars(q.limit(limit)):
        v = trace_view(session, t.task_id)
        if v is not None:
            v["steps_count"] = len(t.steps)
            out.append(v)
    return out


def latest_trace(session: Session, triggered_by: str) -> dict[str, Any] | None:
    t = session.scalar(
        select(AgentTrace)
        .where(AgentTrace.triggered_by == triggered_by)
        .order_by(AgentTrace.created_at.desc())
        .limit(1)
    )
    return trace_view(session, t.task_id) if t else None


def totals(session: Session, *, now: datetime) -> dict[str, Any]:
    """Cost incurred until now: all-time and this month, by agent and by provider/model."""
    rate = get_settings().usd_inr_rate
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    runs = session.scalars(select(AgentRun)).all()
    cfgs = {c.agent_key: c for c in session.scalars(select(AgentConfig))}

    def agg(rows: list[AgentRun]) -> dict[str, Any]:
        usd = sum(r.cost_usd for r in rows)
        ok_tasks = {r.task_id for r in rows if r.status == "ok"}
        task_charge = sum(cfgs[r.agent_key].task_price_inr for r in rows if r.status == "ok")
        outcome_charge = sum(
            cfgs[r.agent_key].outcome_price_inr for r in rows if r.outcome == "accepted"
        )
        return {
            "calls": len(rows),
            "tasks": len({r.task_id for r in rows}),
            "tasks_ok": len(ok_tasks),
            "llm_cost_usd": round(usd, 6),
            "llm_cost_inr": round(usd * rate, 4),
            "real_llm_cost_usd": round(sum(r.cost_usd for r in rows if not r.simulated), 6),
            "simulated_calls": sum(1 for r in rows if r.simulated),
            "tokens": sum(r.input_tokens + r.output_tokens for r in rows),
            "task_based_inr": round(task_charge, 2),
            "outcome_based_inr": round(outcome_charge, 2),
        }

    by_model: dict[str, list[AgentRun]] = {}
    for r in runs:
        by_model.setdefault(f"{r.provider}/{r.model}", []).append(r)
    return {
        "all_time": agg(list(runs)),
        "this_month": agg([r for r in runs if r.created_at >= month_start]),
        "by_agent": {k: agg([r for r in runs if r.agent_key == k]) for k in AGENT_KEYS},
        "by_model": {k: agg(v) for k, v in sorted(by_model.items())},
    }
