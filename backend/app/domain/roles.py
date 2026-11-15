"""Role-based access control (RBAC), checked on every API call.

One permission matrix (PERMISSIONS) says which role may do what. Some permissions are also
scoped to the user's own records (an RM's own portfolio, an analyst's assigned files, the RM
named on a reminder draft). The UI reads the same matrix from /api/rbac, but the server never
trusts the UI.

From the architecture document: each RM sees only their own portfolio, the coordinator sees the
full queue, analysts see the files that reach them, and the credit manager and CRO see oversight
data only (counts and the audit log, never client-level data). The AI Agent Owner role was added
for the prototype's AI governance: it maintains agent prompts and model routing and sees agent
costs, but no client files and no audit log. The CFO Office (finance) role sees AI
costs and agent governance read-only, and nothing else.
"""

from __future__ import annotations

from app.models import Application, Staff


class DomainError(Exception):
    status_code = 400


class Forbidden(DomainError):
    status_code = 403


class NotFound(DomainError):
    status_code = 404


class Conflict(DomainError):
    status_code = 409


class Invalid(DomainError):
    status_code = 422


ROLE_LABELS = {
    "rm": "Relationship Manager",
    "coordinator": "Credit Operations Coordinator",
    "analyst": "Credit Analyst",
    "credit_manager": "Credit Manager",
    "cro": "CRO Oversight",
    "agent_owner": "AI Agent Owner",
    "finance": "CFO Office (Finance)",
}

# permission -> (description, {role: scope}). Scope: "all", "own" (RM's portfolio / named RM),
# "assigned" (analyst's files).
PERMISSIONS: dict[str, tuple[str, dict[str, str]]] = {
    "queue.view": ("See the application queue", {"rm": "own", "coordinator": "all"}),
    "application.view": (
        "Open an application checklist and timeline",
        {"rm": "own", "coordinator": "all", "analyst": "assigned"},
    ),
    "item.receive": ("Confirm a document was received", {"coordinator": "all"}),
    "item.waive": ("Waive a document (reason required)", {"rm": "own", "coordinator": "all"}),
    "reminder.draft": ("Create and edit reminder drafts", {"rm": "own", "coordinator": "all"}),
    "reminder.approve_send": (
        "Approve, schedule and send a reminder to the client",
        {"rm": "own"},  # only the RM named on the draft
    ),
    "ai.use": ("Use AI reword and critique on a draft", {"rm": "own", "coordinator": "all"}),
    "analyst.view": ("Analyst file view (complete or blocked)", {"analyst": "assigned"}),
    "analyst.request": ("Send a linked request to the RM", {"analyst": "assigned"}),
    "oversight.view": (
        "Oversight counts (no client data)",
        {"credit_manager": "all", "cro": "all"},
    ),
    "audit.view": ("Search and export the audit log", {"credit_manager": "all", "cro": "all"}),
    "agents.view_costs": (
        "See AI agent settings, cost ledger and versions",
        {"credit_manager": "all", "cro": "all", "agent_owner": "all", "finance": "all"},
    ),
    "agents.edit_business": (
        "Switch an agent on/off, set budgets and prices",
        {"credit_manager": "all"},
    ),
    "agents.edit_behaviour": (
        "Edit agent prompts, tone, models, fallback and timeout; restore versions",
        {"agent_owner": "all"},
    ),
    "agents.test": ("Test a prompt on synthetic sample text", {"agent_owner": "all"}),
}

# Which agent config fields each edit permission covers (field-level RBAC).
AGENT_FIELD_PERMISSION = {
    "enabled": "agents.edit_business",
    "monthly_budget_usd": "agents.edit_business",
    "task_price_inr": "agents.edit_business",
    "outcome_price_inr": "agents.edit_business",
    "prompt": "agents.edit_behaviour",
    "tone": "agents.edit_behaviour",
    "primary_provider": "agents.edit_behaviour",
    "primary_model": "agents.edit_behaviour",
    "fallback_provider": "agents.edit_behaviour",
    "fallback_model": "agents.edit_behaviour",
    "timeout_seconds": "agents.edit_behaviour",
    "simulate_primary_outage": "agents.edit_behaviour",
}

SCREENS = {
    "rm": ["queue", "checklist", "composer"],
    "coordinator": ["queue", "checklist", "composer"],
    "analyst": ["analyst", "checklist"],
    "credit_manager": ["oversight"],
    "cro": ["oversight"],
    "agent_owner": ["agents"],
    "finance": ["agents"],
}


def has(user: Staff, permission: str) -> bool:
    return user.role in PERMISSIONS[permission][1]


def scope(user: Staff, permission: str) -> str | None:
    return PERMISSIONS[permission][1].get(user.role)


def permissions_for(role: str) -> list[str]:
    return [p for p, (_, roles) in PERMISSIONS.items() if role in roles]


def editable_agent_fields(user: Staff) -> list[str]:
    return [f for f, p in AGENT_FIELD_PERMISSION.items() if has(user, p)]


def matrix() -> dict[str, object]:
    return {
        "roles": [{"id": r, "label": label} for r, label in ROLE_LABELS.items()],
        "permissions": [
            {"id": p, "description": d, "roles": roles} for p, (d, roles) in PERMISSIONS.items()
        ],
    }


def _in_scope(user: Staff, permission: str, app: Application) -> bool:
    s = scope(user, permission)
    if s == "all":
        return True
    if s == "own":
        return app.rm_id == user.id
    if s == "assigned":
        return app.analyst_id == user.id
    return False


def can_see_queue(user: Staff) -> bool:
    return has(user, "queue.view")


def can_view_application(user: Staff, app: Application) -> bool:
    return _in_scope(user, "application.view", app)


def require_view(user: Staff, app: Application) -> None:
    if not can_view_application(user, app):
        # Same response as a missing file, so IDs outside a portfolio are not disclosed.
        raise NotFound("application not found")


def can_mark_received(user: Staff, app: Application) -> bool:
    # Stand-in for the document-store integration: Operations confirms receipt.
    return _in_scope(user, "item.receive", app)


def can_waive(user: Staff, app: Application) -> bool:
    return _in_scope(user, "item.waive", app)


def can_draft_reminder(user: Staff, app: Application) -> bool:
    return _in_scope(user, "reminder.draft", app)


def can_use_ai(user: Staff, app: Application) -> bool:
    return _in_scope(user, "ai.use", app)


def can_approve_reminder(user: Staff, named_rm_id: str) -> bool:
    """Only the RM named on the draft may approve it. Nobody else, under any role."""
    return has(user, "reminder.approve_send") and user.id == named_rm_id


def can_use_analyst_view(user: Staff, app: Application) -> bool:
    return _in_scope(user, "analyst.view", app)


def can_see_oversight(user: Staff) -> bool:
    return has(user, "oversight.view")


def require(condition: bool, message: str = "not permitted for this role") -> None:
    if not condition:
        raise Forbidden(message)


def require_permission(user: Staff, permission: str) -> None:
    if not has(user, permission):
        raise Forbidden(f"your role ({ROLE_LABELS[user.role]}) lacks permission {permission}")
