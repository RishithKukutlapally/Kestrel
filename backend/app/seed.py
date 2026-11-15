"""Synthetic demo data. Re-runnable:  python -m app.seed [--reset]

Everything here is fictitious: client names, people, e-mail addresses (reserved .example
domain) and application IDs. There are no PAN, Aadhaar, GSTIN, account numbers, amounts
or any credit information. Dates are relative to the moment the seed runs.

The seed replays each application's history through the same domain functions the API
uses, in time order, so the event log (and its hash chain) looks like real usage.
"""

from __future__ import annotations

import argparse
import os
import sys
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, inspect, select
from sqlalchemy.orm import Session

from app.ai import agents, pipeline, providers
from app.auth import hash_password
from app.config import get_settings
from app.db import get_engine
from app.domain import reminders, tracker
from app.domain.events import Actor
from app.domain.status import IST, now_utc
from app.models import Application, ChecklistRule, DocumentItem, Staff

RULE_VERSION = 1

STAFF = [
    ("rm-vikram", "Vikram Desai", "rm", "Relationship Manager, SME Desk 4"),
    ("rm-priya", "Priya Sharma", "rm", "Relationship Manager, SME Desk 2"),
    ("rm-rohan", "Rohan Mehta", "rm", "Relationship Manager, SME Desk 3"),
    ("rm-arjun", "Arjun Nair", "rm", "Relationship Manager, SME Desk 1"),
    ("coord-sunita", "Sunita Rao", "coordinator", "Credit Operations Coordinator"),
    ("an-ananya", "Ananya Sengupta", "analyst", "Credit Analyst"),
    ("an-karan", "Karan Iyer", "analyst", "Credit Analyst"),
    ("cm-meera", "Meera Kulkarni", "credit_manager", "Credit Manager"),
    ("cro-rahul", "Rahul Bhatia", "cro", "CRO Office, Oversight"),
    ("ao-dev", "Dev Raman", "agent_owner", "AI Agent Owner"),
    ("fin-kavya", "Kavya Menon", "finance", "CFO Office, Finance"),
]

# ASSUMPTION (Credit to confirm): placeholder document list per product, applicant type
# and loan band. Stored as a versioned rule table so Credit can change it without a release.
# (category_order, category, doc_name, owner, product, applicant_type, loan_band)
RULES = [
    (
        1,
        "Identity and Constitution",
        "Certificate of Incorporation / Registration",
        "Client",
        "*",
        "*",
        "*",
    ),
    (1, "Identity and Constitution", "MoA & AoA", "Client", "*", "Private Limited", "*"),
    (
        1,
        "Identity and Constitution",
        "Partnership Deed / LLP Agreement",
        "Client",
        "*",
        "Partnership / LLP",
        "*",
    ),
    (
        1,
        "Identity and Constitution",
        "Shop & Establishment Licence",
        "Client",
        "*",
        "Proprietorship",
        "*",
    ),
    (
        1,
        "Identity and Constitution",
        "KYC documents of directors / partners / proprietor",
        "Client",
        "*",
        "*",
        "*",
    ),
    (
        1,
        "Identity and Constitution",
        "Udyam Registration Certificate",
        "Kestrel Ops",
        "*",
        "*",
        "*",
    ),
    (2, "Bank Statements", "Current account statement (last 12 months)", "Client", "*", "*", "*"),
    (3, "GST Returns", "GSTR-3B returns (last 6 months)", "Client", "*", "*", "*"),
    (3, "GST Returns", "GSTR-1 returns (last 6 months)", "Client", "Working Capital", "*", "*"),
    (
        4,
        "Financial Statements",
        "Audited financial statements (last 2 years)",
        "Client",
        "*",
        "*",
        "₹10L–₹25L",
    ),
    (
        4,
        "Financial Statements",
        "Audited financial statements (last year)",
        "Client",
        "*",
        "*",
        "Up to ₹10L",
    ),
    (
        4,
        "Financial Statements",
        "Provisional financials (current year)",
        "Client",
        "Working Capital",
        "*",
        "*",
    ),
    (
        5,
        "Other Documents",
        "Business premises proof (rent agreement or ownership)",
        "Client",
        "*",
        "*",
        "*",
    ),
    (
        5,
        "Other Documents",
        "Quotation / proforma invoice for the asset",
        "Client",
        "Term Loan",
        "*",
        "*",
    ),
]


@dataclass
class Case:
    id: str
    client: str
    city: str
    product: str
    applicant_type: str
    band: str
    contact: str
    rm: str
    opened_days_ago: int
    analyst: str | None = None
    # Substrings of document names still outstanding today.
    outstanding: list[str] = field(default_factory=list)
    waived: list[tuple[str, str]] = field(default_factory=list)
    # Reminders sent (days ago) covering whatever was outstanding then.
    sent_reminders: list[int] = field(default_factory=list)
    draft_now: bool = False
    scheduled_tomorrow: bool = False
    analyst_request: tuple[list[str], str, int] | None = None  # (items, note, days ago)


CASES = [
    Case(
        "KF-2026-1021",
        "Saffronvale Fabricators Pvt Ltd",
        "Surat",
        "Working Capital",
        "Private Limited",
        "₹10L–₹25L",
        "Meenal Kapadia",
        "rm-vikram",
        18,
        analyst="an-ananya",
        outstanding=["KYC documents", "GSTR-3B"],
        sent_reminders=[10],
        draft_now=True,
        analyst_request=(["GSTR-3B"], "Need all six monthly GSTR-3B acknowledgements to start.", 2),
    ),
    Case(
        "KF-2026-1033",
        "Copperleaf Die-Cast Works",
        "Pune",
        "Term Loan",
        "Partnership / LLP",
        "Up to ₹10L",
        "Harish Kulkarni",
        "rm-rohan",
        16,
        analyst="an-karan",
        outstanding=["Audited financial", "Quotation"],
        sent_reminders=[9],
        waived=[
            (
                "Business premises",
                "Unit operates from partner-owned premises; ownership "
                "proof already held from an earlier facility",
            )
        ],
    ),
    Case(
        "KF-2026-1049",
        "Quillstone Precision Forgings Pvt Ltd",
        "Aurangabad",
        "Working Capital",
        "Private Limited",
        "₹10L–₹25L",
        "Pradeep Joshi",
        "rm-vikram",
        14,
        outstanding=["Current account", "GSTR-3B", "Provisional"],
        sent_reminders=[8],
        draft_now=True,
    ),
    Case(
        "KF-2026-1082",
        "Indigo Heron Agro Foods LLP",
        "Nashik",
        "Working Capital",
        "Partnership / LLP",
        "Up to ₹10L",
        "Lata Pawar",
        "rm-priya",
        11,
        outstanding=["Provisional", "GSTR-1"],
        sent_reminders=[5],
    ),
    Case(
        "KF-2026-1104",
        "Marigold Crest Chem-Tech",
        "Vapi",
        "Term Loan",
        "Private Limited",
        "₹10L–₹25L",
        "Devang Shah",
        "rm-rohan",
        4,
        outstanding=["Udyam", "Business premises", "Quotation", "Audited financial"],
    ),
    Case(
        "KF-2026-1150",
        "Monsoonrise Polymers LLP",
        "Thane",
        "Working Capital",
        "Partnership / LLP",
        "₹10L–₹25L",
        "Farah Shaikh",
        "rm-arjun",
        3,
        outstanding=["Current account", "Provisional"],
    ),
    Case(
        "KF-2026-1162",
        "Banyan Arc Pharma Distributors",
        "Mumbai",
        "Working Capital",
        "Proprietorship",
        "Up to ₹10L",
        "Nitin Bhosale",
        "rm-priya",
        9,
        analyst="an-ananya",
        waived=[("GSTR-1", "Quarterly filer under the QRMP scheme; GSTR-3B covers the period")],
    ),
    Case(
        "KF-2026-1188",
        "Pebblegate Food Processing",
        "Bharuch",
        "Term Loan",
        "Proprietorship",
        "Up to ₹10L",
        "Kiran Vasava",
        "rm-arjun",
        2,
        outstanding=["Shop & Establishment", "Audited financial", "Quotation"],
        draft_now=True,
    ),
    Case(
        "KF-2026-1203",
        "Tidewell Cold Chain Logistics",
        "Kochi",
        "Term Loan",
        "Private Limited",
        "₹10L–₹25L",
        "Anitha Menon",
        "rm-vikram",
        6,
        outstanding=["GSTR-3B", "Quotation", "Current account"],
    ),
    Case(
        "KF-2026-1217",
        "Lanternfly Packaging Works",
        "Indore",
        "Working Capital",
        "Proprietorship",
        "Up to ₹10L",
        "Sandeep Raghuwanshi",
        "rm-priya",
        21,
        analyst="an-karan",
        sent_reminders=[12],
    ),
    Case(
        "KF-2026-1231",
        "Silvermoth Auto Components Pvt Ltd",
        "Chennai",
        "Term Loan",
        "Private Limited",
        "₹10L–₹25L",
        "Revathi Subramanian",
        "rm-arjun",
        13,
        analyst="an-karan",
        outstanding=["Quotation"],
        sent_reminders=[7],
        scheduled_tomorrow=True,
    ),
    Case(
        "KF-2026-1246",
        "Juniper Ridge Garments",
        "Tiruppur",
        "Working Capital",
        "Partnership / LLP",
        "₹10L–₹25L",
        "Selvi Murugan",
        "rm-rohan",
        1,
        outstanding=[
            "Certificate",
            "Partnership",
            "KYC",
            "Udyam",
            "Current account",
            "GSTR",
            "Audited",
            "Provisional",
            "Business premises",
        ],
    ),
]


def _email(client: str) -> str:
    slug = "".join(ch for ch in client.lower() if ch.isalnum())[:24]
    return f"documents@{slug}.example"


def at(now: datetime, days_ago: float, hour: int = 10, minute: int = 0) -> datetime:
    """A moment `days_ago` days before now, at a working-hours IST time, never in the future."""
    day = (now.astimezone(IST) - timedelta(days=days_ago)).date()
    moment = datetime.combine(day, time(hour, minute), tzinfo=IST)
    return min(moment, now - timedelta(minutes=5))


Step = tuple[datetime, int, Callable[[Session], None]]


def plan(now: datetime) -> list[Step]:
    steps: list[Step] = []
    seq = 0

    def add(when: datetime, fn: Callable[[Session], None]) -> None:
        nonlocal seq
        seq += 1
        steps.append((when, seq, fn))

    def find(s: Session, app_id: str, key: str) -> DocumentItem:
        app = s.get(Application, app_id)
        assert app is not None
        for it in app.items:
            if key.lower() in it.name.lower():
                return it
        raise KeyError(f"{app_id}: no item matching {key!r}")

    def matches(name: str, keys: list[str]) -> bool:
        return any(k.lower() in name.lower() for k in keys)

    coordinator = Actor("coord-sunita", "Sunita Rao", "coordinator")

    for c in CASES:
        opened = at(now, c.opened_days_ago, 9, 30)

        def open_app(s: Session, c: Case = c, opened: datetime = opened) -> None:
            app = Application(
                id=c.id,
                client_name=c.client,
                city=c.city,
                product=c.product,
                applicant_type=c.applicant_type,
                loan_band=c.band,
                contact_name=c.contact,
                contact_email=_email(c.client),
                rm_id=c.rm,
                analyst_id=c.analyst,
                opened_at=opened,
                rule_version=RULE_VERSION,
            )
            s.add(app)
            s.flush()
            tracker.generate_checklist(s, app, now=opened)

        add(opened, open_app)

        # Receipts: everything not outstanding or waived, spread over the file's life.
        waived_keys = [w[0] for w in c.waived]
        span = max(1, c.opened_days_ago - 1)
        rule_docs = [
            r
            for r in RULES
            if r[4] in ("*", c.product)
            and r[5] in ("*", c.applicant_type)
            and r[6] in ("*", c.band)
        ]
        k = 0
        for r in rule_docs:
            name = r[2]
            if matches(name, c.outstanding) or matches(name, waived_keys):
                continue
            k += 1
            days_ago = c.opened_days_ago - min(span, 1 + (k * 3) % (span + 1)) + 0.0
            when = at(now, max(0.0, days_ago), 11 + k % 6, (k * 7) % 60)

            def receive(s: Session, c: Case = c, name: str = name, when: datetime = when) -> None:
                app = s.get(Application, c.id)
                assert app is not None
                tracker.mark_received(s, app, find(s, c.id, name).id, actor=coordinator, now=when)

            add(when, receive)

        for key, reason in c.waived:
            when = at(now, max(0, c.opened_days_ago - 3), 15, 10)

            def waive(
                s: Session, c: Case = c, key: str = key, reason: str = reason, when: datetime = when
            ) -> None:
                app = s.get(Application, c.id)
                assert app is not None
                rm = s.get(Staff, c.rm)
                assert rm is not None
                tracker.waive(
                    s, app, find(s, c.id, key).id, reason=reason, actor=Actor.of(rm), now=when
                )

            add(when, waive)

        for days_ago in c.sent_reminders:
            drafted = at(now, days_ago, 9, 45)
            approved = drafted + timedelta(minutes=40)

            def remind(
                s: Session, c: Case = c, drafted: datetime = drafted, approved: datetime = approved
            ) -> None:
                app = s.get(Application, c.id)
                assert app is not None
                if not reminders.outstanding(app):
                    return
                rm = s.get(Staff, c.rm)
                assert rm is not None
                r = reminders.create_draft(s, app, actor=rm, now=drafted)
                reminders.approve_and_send(s, r, actor=rm, now=approved)

            add(drafted, remind)

        if c.draft_now or c.scheduled_tomorrow:
            drafted = now - timedelta(hours=2)

            def draft(s: Session, c: Case = c, drafted: datetime = drafted) -> None:
                app = s.get(Application, c.id)
                assert app is not None
                rm = s.get(Staff, c.rm)
                assert rm is not None
                r = reminders.create_draft(s, app, actor=rm, now=drafted)
                if c.scheduled_tomorrow:
                    send_at = datetime.combine(
                        (now.astimezone(IST) + timedelta(days=1)).date(), time(10, 0), tzinfo=IST
                    )
                    reminders.schedule(
                        s, r, actor=rm, now=drafted + timedelta(minutes=20), send_at=send_at
                    )

            add(drafted, draft)

        if c.analyst_request:
            keys, note, days_ago = c.analyst_request
            when = at(now, days_ago, 14, 12)

            def ask(
                s: Session,
                c: Case = c,
                keys: list[str] = keys,
                note: str = note,
                when: datetime = when,
            ) -> None:
                app = s.get(Application, c.id)
                assert app is not None
                analyst = s.get(Staff, c.analyst)
                assert analyst is not None
                tracker.request_from_rm(
                    s,
                    app,
                    item_ids=[find(s, c.id, k).id for k in keys],
                    note=note,
                    actor=Actor.of(analyst),
                    now=when,
                )

            add(when, ask)

    steps.sort(key=lambda st: (st[0], st[1]))
    return steps


def alembic_config(connection: object | None = None) -> Config:
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    if connection is not None:
        cfg.attributes["connection"] = connection
    return cfg


def migrate(engine: Engine) -> None:
    with engine.begin() as conn:
        command.upgrade(alembic_config(conn), "head")


def reset_schema(engine: Engine) -> None:
    with engine.begin() as conn:
        command.downgrade(alembic_config(conn), "base")
        command.upgrade(alembic_config(conn), "head")


def ai_demo_history(session: Session, now: datetime) -> None:
    """Simulated agent activity so the cost ledger and change history are not empty.

    Every run is produced by the local simulator (labelled "simulated", zero real cost),
    even if API keys are configured: providers.FORCE_SIMULATE is set for the duration.
    """
    s = get_settings()
    saved = (s.feature_ai_drafting, s.ai_demo_simulate)
    s.feature_ai_drafting, s.ai_demo_simulate = True, True
    providers.FORCE_SIMULATE = True
    try:
        owner = session.get(Staff, "ao-dev")  # AI Agent Owner: prompts and model routing
        assert owner is not None
        agents.ensure_defaults(session, now=now - timedelta(days=3), actor="Dev Raman")

        def task(app_id: str, key: str, when: datetime, tone: str | None = None) -> None:
            r = reminders.open_draft(session, app_id)
            assert r is not None
            app = r.application
            names = [tracker.get_item(app, i).name for i in r.item_ids]
            keep = [*names, app.id, reminders.format_due(r.due_date), app.rm.name]
            secrets = {"[[CLIENT]]": app.client_name, "[[CONTACT]]": app.contact_name}
            rm = session.get(Staff, app.rm_id)
            assert rm is not None
            text, _ = agents.run_task(
                session,
                agent_key=key,
                task="reword" if key == "reminder_rewriter" else "critique",
                text=r.body,
                tone=tone,
                must_keep=keep,
                secrets=secrets,
                application_id=app.id,
                reminder_id=r.id,
                actor=rm,
                now=when,
            )
            if key == "reminder_rewriter":
                reminders.update_draft(session, r, actor=rm, now=when, body=text, ai_assisted=True)

        t0 = now - timedelta(minutes=110)
        task("KF-2026-1049", "reminder_rewriter", t0, "formal")
        task("KF-2026-1049", "reminder_critic", t0 + timedelta(minutes=2))
        # Demonstrate switching the agent: cheaper primary model, live on the next call.
        agents.update_config(
            session,
            "reminder_rewriter",
            {
                "primary_provider": "gemini",
                "primary_model": "gemini-3.1-flash-lite",
                "fallback_provider": "gemini",
                "fallback_model": "gemini-3.5-flash-lite",
            },
            note="Cost review: cheaper Gemini 3.1 Flash-Lite as primary, 3.5 Flash-Lite as fallback",
            actor=owner,
            now=t0 + timedelta(minutes=10),
        )
        task(
            "KF-2026-1188", "reminder_rewriter", t0 + timedelta(minutes=10, seconds=42), "friendly"
        )
        # Demonstrate fallback: simulated primary outage, Claude serves the task.
        agents.update_config(
            session,
            "reminder_rewriter",
            {"simulate_primary_outage": True},
            note="Resilience drill: simulate primary outage",
            actor=owner,
            now=t0 + timedelta(minutes=30),
        )
        task("KF-2026-1021", "reminder_rewriter", t0 + timedelta(minutes=31), "firm")
        agents.update_config(
            session,
            "reminder_rewriter",
            {"simulate_primary_outage": False},
            note="Drill finished",
            actor=owner,
            now=t0 + timedelta(minutes=40),
        )
        task("KF-2026-1021", "reminder_critic", t0 + timedelta(minutes=41))
        # Outcome-based pricing: the RM approves and sends an AI-worded reminder.
        r = reminders.open_draft(session, "KF-2026-1188")
        arjun = session.get(Staff, "rm-arjun")
        assert r is not None and arjun is not None
        reminders.approve_and_send(session, r, actor=arjun, now=t0 + timedelta(minutes=50))
        # One full document-chase agent run (plan, draft, reword, critique, hand-off).
        app = session.get(Application, "KF-2026-1203")
        vikram = session.get(Staff, "rm-vikram")
        assert app is not None and vikram is not None
        pipeline.document_chase(
            session, app, tone="friendly", actor=vikram, now=t0 + timedelta(minutes=60)
        )
    finally:
        s.feature_ai_drafting, s.ai_demo_simulate = saved
        providers.FORCE_SIMULATE = False


def username_for(name: str) -> str:
    """Sign-in name: the person's first name in lower case (vikram, sunita, ...)."""
    return name.split()[0].lower()


def password_for(name: str, template: str) -> str:
    """Demo password from the configured pattern, e.g. "{Name}@YourSuffix" -> "Vikram@YourSuffix"."""
    first = name.split()[0]
    return template.replace("{Name}", first).replace("{name}", first.lower())


class MissingPasswordTemplate(RuntimeError):
    pass


def load(session: Session, now: datetime | None = None) -> None:
    now = now or now_utc()
    tmpl = get_settings().demo_password_template
    if tmpl is None:
        raise MissingPasswordTemplate(
            "Set DEMO_PASSWORD_TEMPLATE (e.g. {Name}@YourSuffix) in .env first."
        )
    template = tmpl.get_secret_value()
    for sid, name, role, title in STAFF:
        session.add(
            Staff(
                id=sid,
                name=name,
                role=role,
                title=title,
                username=username_for(name),
                password_hash=hash_password(password_for(name, template)),
            )
        )
    for order, cat, doc, owner, product, atype, band in RULES:
        session.add(
            ChecklistRule(
                version=RULE_VERSION,
                product=product,
                applicant_type=atype,
                loan_band=band,
                category=cat,
                category_order=order,
                doc_name=doc,
                owner=owner,
                active=True,
            )
        )
    session.flush()
    for _when, _seq, fn in plan(now):
        fn(session)
        session.flush()
    ai_demo_history(session, now)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Load synthetic demo data")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="drop and recreate all tables first (destroys the demo audit log)",
    )
    args = parser.parse_args(argv)
    reset = args.reset or os.environ.get("SEED_RESET", "").lower() == "true"

    if get_settings().demo_password_template is None:
        print(
            "Set DEMO_PASSWORD_TEMPLATE (e.g. {Name}@YourSuffix) before seeding; "
            "it sets every demo user's password.",
            file=sys.stderr,
        )
        return 2
    engine = get_engine()
    if reset:
        reset_schema(engine)
    else:
        migrate(engine)
        with Session(engine) as s:
            if "staff" in inspect(engine).get_table_names() and s.scalar(select(Staff.id).limit(1)):
                print(
                    "Database already has data. Re-run with --reset to replace it "
                    "(this deletes the demo event log).",
                    file=sys.stderr,
                )
                return 1
    with Session(engine) as s:
        load(s)
        s.commit()
        n = len(s.scalars(select(Application.id)).all())
    print(f"Seeded {n} synthetic applications into {engine.url.render_as_string()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
