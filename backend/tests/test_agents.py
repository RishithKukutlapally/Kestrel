"""AI agents: cost per call, fallback, live switching, guardrails, RBAC, agent owner, traces."""

import pytest

from app.ai import providers
from app.config import get_settings
from tests.conftest import login, login_owner, switch


@pytest.fixture()
def ai_on():  # type: ignore[no-untyped-def]
    s = get_settings()
    saved = (s.feature_ai_drafting, s.ai_demo_simulate)
    s.feature_ai_drafting, s.ai_demo_simulate = True, True
    providers.FORCE_SIMULATE = True
    yield
    s.feature_ai_drafting, s.ai_demo_simulate = saved
    providers.FORCE_SIMULATE = False


def draft_id(c, app_id="KF-2026-1049") -> int:  # type: ignore[no-untyped-def]
    return int(c.get(f"/api/applications/{app_id}/reminders/current").json()["id"])


def rewriter(g: dict) -> dict:  # type: ignore[type-arg]
    return [a for a in g["agents"] if a["agent_key"] == "reminder_rewriter"][0]


def relogin(c, who: str):  # type: ignore[no-untyped-def]
    c.post("/auth/logout")
    return login_owner(c) if who == "owner" else login(c, who)


# ---------------------------------------------------------------- running agents
def test_reword_returns_cost_and_keeps_draft_unsent(client, ai_on) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    r = c.post(f"/api/reminders/{draft_id(c)}/ai-reword", json={"tone": "friendly"})
    assert r.status_code == 200, r.text
    task, rem = r.json()["task"], r.json()["reminder"]
    assert rem["state"] == "draft" and rem["ai_assisted"] and rem["approved_by"] is None
    assert task["status"] == "ok" and task["simulated"] is True
    assert task["served_by"] == "gemini/gemini-3.1-flash-lite"  # seeded switch is live
    assert task["attempts"][0]["input_tokens"] > 0 and "llm_cost_usd" in task
    assert task["task_price_inr"] == 2.0


def test_fallback_to_second_provider(client, ai_on) -> None:  # type: ignore[no-untyped-def]
    c = login_owner(client)
    r = c.patch(
        "/api/agents/reminder_rewriter", json={"simulate_primary_outage": True, "note": "drill"}
    )
    assert r.status_code == 200
    relogin(c, "rm-vikram")
    task = c.post(f"/api/reminders/{draft_id(c)}/ai-reword", json={}).json()["task"]
    assert task["used_fallback"] and task["served_by"] == "gemini/gemini-3.5-flash-lite"
    assert [a["status"] for a in task["attempts"]] == ["error", "ok"]


def test_switching_model_applies_to_next_call(client, ai_on) -> None:  # type: ignore[no-untyped-def]
    c = login_owner(client)
    r = c.patch(
        "/api/agents/reminder_rewriter",
        json={
            "primary_provider": "anthropic",
            "primary_model": "claude-haiku-5-5",
            "fallback_provider": "gemini",
            "fallback_model": "gemini-3.5-flash-lite",
            "note": "Try Claude first",
        },
    )
    agent = rewriter(r.json())
    assert agent["last_change"]["first_call_at"] is None
    relogin(c, "rm-vikram")
    task = c.post(f"/api/reminders/{draft_id(c)}/ai-reword", json={}).json()["task"]
    assert task["served_by"] == "anthropic/claude-haiku-5-5"
    assert task["config_version"] == agent["version"]
    relogin(c, "owner")
    assert rewriter(c.get("/api/agents").json())["last_change"]["seconds_to_first_call"] is not None


def test_disabled_agent_refuses(client, ai_on) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "cm-meera")
    c.patch("/api/agents/reminder_critic", json={"enabled": False, "note": "pause critic"})
    switch(c, "rm-vikram")
    r = c.post(f"/api/reminders/{draft_id(c)}/critique", json={})
    assert r.status_code == 409 and "switched off" in r.json()["detail"]


def test_budget_cap(client, ai_on) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "cm-meera")
    c.patch("/api/agents/reminder_rewriter", json={"monthly_budget_usd": 0, "note": "freeze"})
    switch(c, "rm-vikram")
    r = c.post(f"/api/reminders/{draft_id(c)}/ai-reword", json={})
    assert r.status_code == 409 and "budget" in r.json()["detail"]


def test_guardrail_rejects_output_that_adds_credit_content(client, ai_on, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    def bad(system, prompt, *a, **k):  # type: ignore[no-untyped-def]
        return providers.ProviderResult("Your loan of ₹20 lakh is approved.", 10, 10, True)

    monkeypatch.setattr(providers, "_simulate", bad)
    c = login(client, "rm-vikram")
    rid = draft_id(c)
    before = c.get(f"/api/reminders/{rid}").json()["body"]
    assert c.post(f"/api/reminders/{rid}/ai-reword", json={}).status_code == 409
    assert c.get(f"/api/reminders/{rid}").json()["body"] == before
    switch(c, "cro-rahul")
    latest = c.get("/api/agent-runs?limit=1").json()[0]
    assert latest["status"] == "failed"
    assert {a["status"] for a in latest["attempts"]} == {"rejected"}


def test_client_names_are_redacted_before_model_call(client, ai_on, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    seen: list[str] = []
    real = providers._simulate

    def spy(system, prompt):  # type: ignore[no-untyped-def]
        seen.append(prompt)
        return real(system, prompt)

    monkeypatch.setattr(providers, "_simulate", spy)
    c = login(client, "rm-vikram")
    out = c.post(f"/api/reminders/{draft_id(c)}/ai-reword", json={}).json()
    assert "Quillstone" not in seen[0] and "[[CLIENT]]" in seen[0]
    assert "Quillstone" in out["reminder"]["body"]  # restored after the call


def test_governance_view_answers_cost_questions(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "cro-rahul")
    g = c.get("/api/agents").json()
    assert g["can_edit"] is False and g["editable_fields"] == []
    rw = rewriter(g)
    assert rw["tasks_total"] >= 3 and rw["fallback_share_pct"] > 0
    assert rw["outcomes_accepted"] == 1 and rw["outcome_based_charge_inr"] == 5.0
    assert g["totals"]["all_time"]["llm_cost_usd"] >= 0
    runs = c.get("/api/agent-runs").json()
    assert all("llm_cost_usd" in t and t["attempts"] for t in runs)


def test_desk_roles_get_minimal_agent_info(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    g = c.get("/api/agents").json()
    assert "prices" not in g and "tones" in g
    assert c.get("/api/agent-runs").status_code == 403


# ---------------------------------------------------------------- RBAC and agent owner
def test_desk_and_oversight_roles_cannot_change_agents(client) -> None:  # type: ignore[no-untyped-def]
    for who in ("cro-rahul", "rm-vikram", "coord-sunita", "an-ananya"):
        c = login(client, who)
        r = c.patch("/api/agents/reminder_rewriter", json={"enabled": False, "note": "attempt"})
        assert r.status_code == 403, who


def test_unpriced_model_rejected(client) -> None:  # type: ignore[no-untyped-def]
    c = login_owner(client)
    r = c.patch("/api/agents/reminder_rewriter", json={"primary_model": "gpt-x", "note": "x y z"})
    assert r.status_code == 422


def test_field_level_rbac(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "cm-meera")  # business controls only
    r = c.patch("/api/agents/reminder_rewriter", json={"prompt": "x" * 60, "note": "try"})
    assert r.status_code == 403
    r = c.patch("/api/agents/reminder_rewriter", json={"monthly_budget_usd": 30, "note": "raise"})
    assert r.status_code == 200
    relogin(c, "owner")  # behaviour only
    r = c.patch("/api/agents/reminder_rewriter", json={"monthly_budget_usd": 99, "note": "nope"})
    assert r.status_code == 403
    prompt = "You rewrite reminders for small businesses. Be brief. Tone: {tone}."
    r = c.patch("/api/agents/reminder_rewriter", json={"prompt": prompt, "note": "shorter"})
    assert r.status_code == 200


def test_agent_owner_login_is_separate_and_locked(client) -> None:  # type: ignore[no-untyped-def]
    c = login_owner(client)
    info = c.get("/api/session").json()
    assert info["user"]["role"] == "agent_owner" and info["locked"] is True
    assert info["screens"] == ["agents"] and len(info["demo_users"]) == 1
    assert c.post("/api/session/switch", json={"staff_id": "rm-vikram"}).status_code == 403
    assert c.get("/api/queue").status_code == 403
    assert c.get("/api/audit").status_code == 403
    assert c.get("/api/applications/KF-2026-1049").status_code == 404


def test_restore_previous_prompt_version(client) -> None:  # type: ignore[no-untyped-def]
    c = login_owner(client)
    original = rewriter(c.get("/api/agents").json())["config"]["prompt"]
    prompt = "Rewrite this reminder very briefly for the client. Tone: {tone}. Thank you."
    c.patch("/api/agents/reminder_rewriter", json={"prompt": prompt, "note": "experiment"})
    r = c.post("/api/agents/reminder_rewriter/restore", json={"version": 1, "note": "roll back"})
    rw = rewriter(r.json())
    assert rw["config"]["prompt"] == original
    assert rw["last_change"]["note"] == "roll back"


def test_prompt_test_returns_trace_and_cost(client, ai_on) -> None:  # type: ignore[no-untyped-def]
    c = login_owner(client)
    prompt = "You rewrite reminders for small businesses, kindly and clearly. Tone: {tone}."
    r = c.post("/api/agents/reminder_rewriter/test", json={"prompt": prompt, "tone": "concise"})
    body = r.json()
    assert body["status"] == "ok" and body["output"]
    names = [s["step"] for s in body["trace"]["steps"]]
    assert any("data minimisation" in n for n in names)
    assert any("output validation" in n for n in names)
    assert "total_cost_usd" in body["trace"]
    assert c.get("/api/agents").json()["totals"]["all_time"]["calls"] > 0


def test_document_chase_agent_end_to_end(client, ai_on) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    r = c.post("/api/applications/KF-2026-1203/chase-agent", json={"tone": "friendly"})
    assert r.status_code == 200, r.text
    body = r.json()
    steps = [s["step"] for s in body["steps"]]
    assert steps[0].startswith("Plan") and steps[-1].startswith("Hand-off")
    assert body["reminder"]["state"] == "draft" and body["reminder"]["ai_assisted"]
    assert body["reminder"]["approved_by"] is None
    t = c.get(f"/api/agent-traces/{body['trace_id']}").json()
    assert t["kind"] == "pipeline" and len(t["steps"]) == len(body["steps"])
    switch(c, "rm-priya")  # another RM cannot read this trace
    assert c.get(f"/api/agent-traces/{body['trace_id']}").status_code == 404


def test_rbac_matrix_endpoint(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "coord-sunita")
    m = c.get("/api/rbac").json()
    perms = {p["id"]: p["roles"] for p in m["permissions"]}
    assert "agent_owner" in perms["agents.edit_behaviour"]
    assert "coordinator" not in perms["reminder.approve_send"]
    assert m["you"]["role"] == "coordinator"


def test_due_date_may_be_reworded_but_not_dropped() -> None:
    from app.ai.agents import _validate

    keep = ["KF-2026-1049", "Wednesday, 18 Nov 2026"]
    ok = "Re KF-2026-1049: please send by 18 November 2026. Thanks."
    assert _validate("reword", ok, keep) is None
    assert _validate("reword", "KF-2026-1049 by November 18, 2026", keep) is None
    bad = _validate("reword", "KF-2026-1049 please send soon", keep)
    assert bad is not None and "Wednesday, 18 Nov 2026" in bad
    assert "₹" in (_validate("reword", "KF-2026-1049 18 Nov 2026 pay ₹500", keep) or "")


def test_cfo_office_sees_costs_read_only(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "fin-kavya")
    info = c.get("/api/session").json()
    assert info["screens"] == ["agents"]
    g = c.get("/api/agents").json()
    assert g["totals"]["all_time"]["calls"] > 0 and g["editable_fields"] == []
    assert g["can_test"] is False
    assert c.get("/api/agent-runs").status_code == 200
    r = c.patch("/api/agents/reminder_rewriter", json={"enabled": False, "note": "try to disable"})
    assert r.status_code == 403
    assert c.post("/api/agents/reminder_rewriter/test", json={}).status_code == 403
    assert c.get("/api/queue").status_code == 403
    assert c.get("/api/audit").status_code == 403
    assert c.get("/api/applications/KF-2026-1049").status_code == 404
