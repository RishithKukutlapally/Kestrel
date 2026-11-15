/** Screen E: Oversight & audit. Markup from Design/oversight_audit_1/code.html.
 *  Changes: "Aggregate Requested Limit ₹", client names in "Critical stalls" and in the audit
 *  log, "RBI Inspection Dossier", PDF export and compliance claims removed; the hash column is
 *  a real SHA-256 chain verified by the server. Added: AI agent governance (cost per call,
 *  model switching, prompt/tone, budgets, version history) — counts and costs only. */

import { api, ApiError, type AuditPage, type Oversight } from "../api";
import { auditTimestamp, timestamp } from "../format";
import { html, icon, raw, type SafeHtml } from "../html";
import { link, type Route } from "../router";
import { EVENT_CHIP, EVENT_TYPES } from "../status";
import type { Ctx } from "../main";

interface Attempt { route: string; provider: string; model: string; status: string; error: string | null; input_tokens: number; output_tokens: number; cost_usd: number; latency_ms: number; simulated: boolean }
export interface TaskRow { task_id: string; agent_key: string; task: string; config_version: number; application_id: string | null; triggered_by: string; created_at: string; status: string; served_by: string | null; used_fallback: boolean; simulated: boolean; tone: string | null; attempts: Attempt[]; tokens: number; llm_cost_usd: number; llm_cost_inr: number; task_price_inr: number; outcome: string; outcome_price_inr: number }
interface AgentCfg { enabled: boolean; primary_provider: string; primary_model: string; fallback_provider: string; fallback_model: string; tone: string; prompt: string; task_price_inr: number; outcome_price_inr: number; monthly_budget_usd: number; timeout_seconds: number; simulate_primary_outage: boolean }
interface AgentGov {
  agent_key: string; display_name: string; description: string; config: AgentCfg; version: number; updated_by: string; updated_at: string;
  circuit: { primary_open: boolean; fallback_open: boolean };
  tasks_total: number; tasks_ok: number; fallback_share_pct: number; served_by: Record<string, number>;
  llm_cost_usd_total: number; llm_cost_usd_per_task: number; llm_cost_inr_per_task: number; month_spend_usd: number;
  task_based_charge_inr: number; outcome_based_charge_inr: number; outcomes_accepted: number;
  last_change: { version: number; fields: string[]; note: string; by: string; at: string; first_call_at: string | null; seconds_to_first_call: number | null } | null;
  versions: { version: number; fields: string[]; note: string; by: string; at: string; prompt?: string; tone?: string; primary?: string; fallback?: string }[];
}
interface Agg { calls: number; tasks: number; tasks_ok: number; llm_cost_usd: number; llm_cost_inr: number; real_llm_cost_usd: number; simulated_calls: number; tokens: number; task_based_inr: number; outcome_based_inr: number }
export interface Totals { all_time: Agg; this_month: Agg; by_agent: Record<string, Agg>; by_model: Record<string, Agg> }
export interface Governance { enabled: boolean; simulated_mode: boolean; keys: { gemini: boolean; anthropic: boolean }; usd_inr_rate: number; tones: string[]; catalogue: Record<string, string[]>; prices: { provider: string; model: string; input: number; output: number; source: string; as_of: string }[]; agents: AgentGov[]; can_edit: boolean; editable_fields: string[]; can_test: boolean; totals: Totals }

export async function renderOversight(ctx: Ctx, route: Route): Promise<void> {
  const p = route.params;
  const qs = new URLSearchParams();
  if (p.get("q")) qs.set("q", p.get("q")!);
  if (p.get("type")) qs.set("type", p.get("type")!);
  if (p.get("days")) qs.set("days", p.get("days")!);
  qs.set("limit", "25");
  qs.set("offset", String(Number(p.get("page") ?? "0") * 25));
  const [s, audit, verify, gov, runs] = await Promise.all([
    api.get<Oversight>("/api/oversight/summary"),
    api.get<AuditPage>(`/api/audit?${qs}`),
    api.get<{ ok: boolean; events_checked: number; first_bad_event_id: number | null }>("/api/audit/verify"),
    api.get<Governance>("/api/agents"),
    api.get<TaskRow[]>("/api/agent-runs?limit=25"),
  ]);
  ctx.root.innerHTML = view(s, audit, verify, gov, runs, p).value;
  wire(ctx, p, gov);
}

function setParam(p: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(p);
  if (value) next.set(key, value);
  else next.delete(key);
  next.delete("page");
  return link("oversight", undefined, Object.fromEntries(next));
}

function wire(ctx: Ctx, p: URLSearchParams, gov: Governance): void {
  const root = ctx.root;
  const search = root.querySelector<HTMLInputElement>("#auditSearchInput")!;
  let t: number | undefined;
  search.addEventListener("input", () => {
    window.clearTimeout(t);
    t = window.setTimeout(() => ctx.go(setParam(p, "q", search.value.trim())), 350);
  });
  root.querySelectorAll<HTMLSelectElement>("select[data-param]").forEach((sel) =>
    sel.addEventListener("change", () => ctx.go(setParam(p, sel.dataset.param!, sel.value))),
  );
  root.querySelector("#reset-filters")?.addEventListener("click", () => ctx.go(link("oversight")));
  root.querySelector("#export-csv")?.addEventListener("click", () => {
    const qs = new URLSearchParams();
    for (const k of ["q", "type", "days"]) if (p.get(k)) qs.set(k, p.get(k)!);
    window.location.assign(`/api/audit.csv?${qs}`);
  });
  root.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy!);
        ctx.toast("Hash copied to clipboard");
      } catch {
        ctx.toast(b.dataset.copy!);
      }
    }),
  );

  wireGovernance(ctx, gov, () => renderOversight(ctx, { screen: "oversight", id: null, params: p }));
}

/** Wires agent config forms and restore buttons. Fields a role cannot edit are disabled and
 *  never sent; the server enforces the same field-level RBAC. */
export function wireGovernance(ctx: Ctx, gov: Governance, rerender: () => Promise<void>): void {
  const root = ctx.root;
  const editable = new Set(gov.editable_fields ?? []);
  root.querySelectorAll<HTMLFormElement>("form[data-agent]").forEach((form) => {
    const key = form.dataset.agent!;
    const syncModels = (route: "primary" | "fallback") => {
      const prov = form.querySelector<HTMLSelectElement>(`[name=${route}_provider]`)!;
      const model = form.querySelector<HTMLSelectElement>(`[name=${route}_model]`)!;
      const opts = gov.catalogue[prov.value] ?? [];
      const current = model.value;
      model.innerHTML = opts.map((m) => html`<option value="${m}" ${m === current ? raw("selected") : ""}>${m}</option>`.value).join("");
    };
    form.querySelector(`[name=primary_provider]`)?.addEventListener("change", () => syncModels("primary"));
    form.querySelector(`[name=fallback_provider]`)?.addEventListener("change", () => syncModels("fallback"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const all: Record<string, unknown> = {
        enabled: fd.get("enabled") === "on",
        simulate_primary_outage: fd.get("simulate_primary_outage") === "on",
        primary_provider: fd.get("primary_provider"),
        primary_model: fd.get("primary_model"),
        fallback_provider: fd.get("fallback_provider"),
        fallback_model: fd.get("fallback_model"),
        tone: fd.get("tone"),
        prompt: fd.get("prompt"),
        task_price_inr: Number(fd.get("task_price_inr")),
        outcome_price_inr: Number(fd.get("outcome_price_inr")),
        monthly_budget_usd: Number(fd.get("monthly_budget_usd")),
        timeout_seconds: Number(fd.get("timeout_seconds")),
      };
      const body: Record<string, unknown> = { note: String(fd.get("note") ?? "") };
      for (const [k, v] of Object.entries(all)) if (editable.has(k) && v !== null) body[k] = v;
      const err = form.querySelector(".form-error")!;
      try {
        await api.patch(`/api/agents/${key}`, body);
        ctx.toast("Saved as a new version. It applies to the next call; no deploy or restart.");
        await rerender();
        document.getElementById(`agent-${key}`)?.scrollIntoView();
      } catch (ex) {
        err.textContent = ex instanceof ApiError ? ex.message : "Could not save";
        err.classList.remove("hidden");
      }
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-restore]").forEach((b) =>
    b.addEventListener("click", async () => {
      const [key, version] = b.dataset.restore!.split(":");
      try {
        await api.post(`/api/agents/${key}/restore`, { version: Number(version), note: `Restore v${version}` });
        ctx.toast(`Restored v${version} as a new version. Live on the next call.`);
        await rerender();
        document.getElementById(`agent-${key}`)?.scrollIntoView();
      } catch (ex) {
        ctx.toast(ex instanceof ApiError ? ex.message : "Could not restore");
      }
    }),
  );
}

function pct(n: number, total: number): string {
  return total ? `${((100 * n) / total).toFixed(1)}%` : "0%";
}

function card(label: string, value: SafeHtml | string, unit: string, ico: string, foot: SafeHtml, tone = "text-on-surface"): SafeHtml {
  return html`<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
<div class="flex items-start justify-between"><div>
<span class="font-label-compact text-label-compact uppercase text-on-surface-variant tracking-wider">${label}</span>
<div class="flex items-baseline gap-space-xs mt-1"><span class="font-headline-lg text-headline-lg ${tone}">${value}</span><span class="font-label-default text-label-default text-secondary">${unit}</span></div>
</div><div class="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">${icon(ico, "text-[20px]")}</div></div>
<div class="mt-space-md pt-space-xs">${foot}</div></div>`;
}

function view(s: Oversight, audit: AuditPage, verify: { ok: boolean; events_checked: number }, gov: Governance, runs: TaskRow[], p: URLSearchParams): SafeHtml {
  const total = s.active_files + s.complete_files;
  const buckets: [string, keyof Oversight["ageing_buckets"], string, string][] = [
    ["0–3 DAYS", "0-3", "Healthy", "bg-primary"],
    ["4–7 DAYS", "4-7", "Attention required", "bg-secondary"],
    ["8–14 DAYS", "8-14", "Escalated follow-up", "bg-tertiary"],
    [">14 DAYS", "15+", "Critical stall", "bg-error"],
  ];
  const page = Number(p.get("page") ?? "0");
  return html`<section class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mb-space-lg">
<div class="flex flex-col gap-0.5">
<div class="flex items-center gap-space-xs text-on-surface-variant font-label-compact text-label-compact uppercase tracking-wider">${icon("security", "text-[16px] text-primary")}<span>Oversight</span><span class="text-outline-variant" aria-hidden="true">/</span><span>Credit Manager &amp; CRO</span></div>
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Document Tracking Oversight &amp; Audit</h1>
<p class="font-body-compact text-body-compact text-on-surface-variant">Counts and the audit log only. No client names, amounts or other client-level data.</p>
</div>
<div class="flex items-center gap-space-sm flex-wrap">
<div class="flex items-center gap-1.5 px-space-md py-1.5 bg-surface-container rounded-lg text-on-surface font-label-default text-label-default"><span class="w-2 h-2 rounded-full ${verify.ok ? "bg-primary" : "bg-error"}" aria-hidden="true"></span><span class="font-tabular-data text-tabular-data">Hash chain: ${verify.ok ? `verified (${verify.events_checked} events)` : "BROKEN"}</span></div>
<button type="button" id="export-csv" class="flex items-center gap-space-xs px-space-md py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg font-label-default text-label-default transition-colors">${icon("file_download")}<span>Export CSV</span></button>
<a href="#ai-governance" class="flex items-center gap-space-xs px-space-md py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-default text-label-default">${icon("smart_toy")}<span>AI agent governance</span></a>
</div></section>

<section aria-label="Pipeline counts" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-xl">
${card("Total Active Loan Files", String(s.active_files), "Files", "folder_managed", html`<div class="flex items-center justify-between bg-surface-container-low rounded p-1.5 px-2 font-body-compact text-body-compact"><span class="text-on-surface-variant">Complete</span><span class="font-tabular-data font-semibold">${s.complete_files}</span></div>`)}
${card("Files With Overdue Items", String(s.files_with_overdue_items), "Files", "rule_folder", html`<div class="flex flex-col gap-1"><div class="flex justify-between items-center font-body-compact text-body-compact"><span class="text-on-surface-variant">Share of active</span><span class="font-tabular-data font-semibold text-error">${s.overdue_share_pct}%</span></div><div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden"><div class="h-full bg-error rounded-full" style="width:${s.overdue_share_pct}%"></div></div></div>`, "text-error")}
${card("Reminders Sent (30D)", String(s.reminders_sent_30d), "Sent", "verified", html`<div class="flex items-center justify-between bg-surface-container-low rounded p-1.5 px-2"><span class="flex items-center gap-1 font-body-compact text-body-compact text-primary font-medium">${icon("how_to_reg", "text-[14px]")}${s.reminders_approved_30d} approved by named RM</span><span class="font-label-compact text-label-compact px-1.5 py-0.5 rounded ${s.sent_without_named_rm_approval ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-on-surface-variant"}">${s.sent_without_named_rm_approval} without approval</span></div>`)}
${card("Avg Document Turnaround", s.avg_turnaround_days === null ? "–" : String(s.avg_turnaround_days), "Days", "timelapse", html`<div class="flex items-center justify-between font-body-compact text-body-compact bg-surface-container-low rounded p-1.5 px-2"><span class="text-on-surface-variant">Approved without edits</span><span class="font-tabular-data">${s.approved_without_edits_pct === null ? "–" : `${s.approved_without_edits_pct}%`}</span></div>`, "text-tertiary")}
</section>

<section class="grid grid-cols-1 lg:grid-cols-12 gap-space-md mb-space-xl">
<div class="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-space-md"><div><h2 class="font-headline-sm text-headline-sm text-on-surface">Waiting Breakdown by Oldest Outstanding Item</h2>
<p class="font-body-compact text-body-compact text-on-surface-variant">Across ${s.active_files} active files, from the event log</p></div></div>
<div class="grid grid-cols-2 md:grid-cols-4 gap-space-sm mb-space-md">
${buckets.map(([label, key, sub, dot]) => {
  const n = s.ageing_buckets[key];
  const crit = key === "15+";
  return html`<div class="${crit ? "bg-error-container/30" : "bg-surface-container-low"} rounded-lg p-space-md flex flex-col justify-between">
<div class="flex items-center justify-between ${crit ? "text-error" : "text-on-surface-variant"}"><span class="font-label-compact text-label-compact font-semibold">${label}</span><span class="w-2 h-2 rounded-full ${dot}" aria-hidden="true"></span></div>
<div class="my-space-sm"><div class="font-headline-md text-headline-md ${crit ? "text-error" : "text-on-surface"}">${n}</div><div class="font-body-compact text-body-compact ${crit ? "text-error font-medium" : "text-on-surface-variant"} leading-tight">${sub}</div></div>
<div class="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden"><div class="${dot} h-full rounded-full" style="width:${pct(n, s.active_files)}"></div></div>
<span class="font-label-compact text-label-compact ${crit ? "text-error" : "text-on-surface-variant"} text-right mt-1">${pct(n, s.active_files)}</span></div>`;
})}
</div>
${s.critical_stall_count ? html`<div class="bg-error-container/40 rounded-lg p-space-sm px-space-md flex items-center gap-space-sm">${icon("warning", "text-error text-[18px]")}<span class="font-label-default text-label-default text-on-error-container">${s.critical_stall_count} ${s.critical_stall_count === 1 ? "file has" : "files have"} waited more than 14 days (client names withheld from oversight).</span></div>` : ""}
</div>
<div class="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-space-sm"><h2 class="font-headline-sm text-headline-sm text-on-surface">Stage Distribution</h2><span class="font-label-compact text-label-compact text-on-surface-variant">All Files: ${total}</span></div>
<div class="space-y-space-md my-auto">
${([["Doc Collection", s.stages.doc_collection, "bg-primary-container", "text-on-surface"], ["Analyst Blocked", s.stages.analyst_blocked, "bg-error", "text-error"], ["Complete", s.stages.complete, "bg-secondary", "text-on-surface"]] as [string, number, string, string][]).map(
  ([label, n, bar, txt]) => html`<div class="flex flex-col gap-1"><div class="flex items-center justify-between"><div class="flex items-center gap-space-xs"><span class="w-3 h-3 rounded ${bar}" aria-hidden="true"></span><span class="font-body-default text-body-default font-medium ${txt}">${label}</span></div>
<div class="flex items-center gap-space-sm font-tabular-data text-tabular-data"><span class="font-semibold ${txt}">${n} files</span><span class="text-on-surface-variant text-label-compact">(${pct(n, total)})</span></div></div>
<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden"><div class="${bar} h-full rounded-full" style="width:${pct(n, total)}"></div></div></div>`,
)}
</div>
<div class="mt-space-md pt-space-xs font-label-compact text-label-compact text-on-surface-variant flex items-center gap-1">${icon("info", "text-[14px] text-primary")} No credit decision is made in this system.</div>
</div></section>

${governanceView(gov, runs)}

<section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col mt-space-xl" aria-labelledby="audit-title">
<div class="flex flex-col gap-space-md mb-space-md">
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
<div><div class="flex items-center gap-space-xs flex-wrap"><h2 id="audit-title" class="font-headline-md text-headline-md text-on-surface">Searchable Operational Audit Log</h2>
<span class="px-space-sm py-0.5 rounded-full bg-primary/10 text-primary font-label-compact text-label-compact font-semibold">Immutable Append-Only</span></div>
<p class="font-body-compact text-body-compact text-on-surface-variant">Requests, reminder drafts, approvals, sends, receipts, waivers and completions. Each row is SHA-256 chained to the previous one.</p></div>
<span class="px-space-sm py-1 bg-surface-container-low rounded text-on-surface-variant font-label-compact text-label-compact self-start">Showing ${audit.events.length} of ${audit.total} events</span>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm bg-surface-container-low p-space-sm rounded-lg">
<div class="relative flex items-center">${icon("search", "absolute left-2.5 text-on-surface-variant text-[16px]")}<label for="auditSearchInput" class="sr-only">Search the audit log</label>
<input class="w-full h-8 pl-8 pr-3 rounded bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant text-body-compact font-body-compact" id="auditSearchInput" placeholder="Search actor, reason, or KF-2026-..." type="search" value="${p.get("q") ?? ""}"/></div>
<div class="relative flex items-center"><label for="f-type" class="sr-only">Event type</label>
<select id="f-type" data-param="type" class="w-full h-8 px-2.5 rounded bg-surface-container-lowest text-on-surface text-body-compact font-body-compact appearance-none"><option value="">All Event Types</option>${EVENT_TYPES.map(([v, t]) => html`<option value="${v}" ${p.get("type") === v ? raw("selected") : ""}>${t}</option>`)}</select>${icon("expand_more", "absolute right-2 pointer-events-none text-on-surface-variant")}</div>
<div class="relative flex items-center"><label for="f-days" class="sr-only">Date range</label>
<select id="f-days" data-param="days" class="w-full h-8 px-2.5 rounded bg-surface-container-lowest text-on-surface text-body-compact font-body-compact appearance-none">${([["", "Date: All"], ["7", "Date: Past 7 Days"], ["30", "Date: Past 30 Days"]] as [string, string][]).map(([v, t]) => html`<option value="${v}" ${(p.get("days") ?? "") === v ? raw("selected") : ""}>${t}</option>`)}</select>${icon("calendar_today", "absolute right-2 pointer-events-none text-on-surface-variant")}</div>
<button type="button" id="reset-filters" class="h-8 px-space-md rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-default text-label-default flex items-center justify-center gap-1">${icon("restart_alt", "text-[15px]")}<span>Reset Filters</span></button>
</div></div>
<div class="overflow-x-auto rounded-lg">
<table class="w-full text-left border-collapse">
<caption class="sr-only">Audit events, newest first</caption>
<thead><tr class="bg-surface-container-high/60 text-on-surface-variant font-label-compact text-label-compact uppercase tracking-wider h-8">
<th scope="col" class="py-1 px-3 w-44 font-semibold">Timestamp (IST)</th><th scope="col" class="py-1 px-3 w-32 font-semibold">Application</th><th scope="col" class="py-1 px-3 w-44 font-semibold">Event Type</th>
<th scope="col" class="py-1 px-3 w-48 font-semibold">Actor (Name &amp; Role)</th><th scope="col" class="py-1 px-3 font-semibold">Action Detail &amp; Reason</th><th scope="col" class="py-1 px-3 w-32 text-right font-semibold">Hash</th>
</tr></thead>
<tbody class="divide-y divide-surface-container-high font-body-compact text-body-compact text-on-surface">
${audit.events.length
  ? audit.events.map(
      (e) => html`<tr class="hover:bg-surface-container-low transition-colors h-11">
<td class="py-1.5 px-3 font-tabular-data text-tabular-data text-secondary whitespace-nowrap">${auditTimestamp(e.occurred_at)}</td>
<td class="py-1.5 px-3 font-tabular-data text-tabular-data font-semibold text-primary">${e.application_id ?? "—"}</td>
<td class="py-1.5 px-3"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-label-compact font-label-compact font-semibold ${EVENT_CHIP[e.event_type] ?? ""}">${e.event_label}</span></td>
<td class="py-1.5 px-3"><div class="flex flex-col"><span class="font-medium text-on-surface">${e.actor_name}</span><span class="font-label-compact text-label-compact text-on-surface-variant">${e.actor_role_label}</span></div></td>
<td class="py-1.5 px-3">${e.reason}</td>
<td class="py-1.5 px-3 text-right"><button type="button" data-copy="${e.hash}" class="font-tabular-data text-tabular-data text-primary hover:underline bg-surface-container px-1.5 py-0.5 rounded" title="Copy full SHA-256 hash">#${e.hash.slice(0, 10)}</button></td>
</tr>`,
    )
  : html`<tr><td colspan="6" class="py-space-xl text-center"><p class="font-headline-sm text-headline-sm text-on-surface">No audit events match your criteria</p><p class="font-body-compact text-body-compact text-on-surface-variant mt-1">Try adjusting the text query or event type filter.</p></td></tr>`}
</tbody></table></div>
<div class="mt-space-lg pt-space-md border-t border-surface-container-high flex flex-col md:flex-row items-center justify-between gap-space-md">
<div class="flex items-center gap-space-sm text-on-surface-variant">${icon("verified_user", "text-[18px] text-primary")}<span class="font-label-compact text-label-compact">Hash chain checked on every load. The database rejects UPDATE and DELETE on events.</span></div>
<nav aria-label="Audit pages" class="flex items-center gap-space-xs">
${page > 0 ? html`<a class="h-8 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high font-label-default text-label-default flex items-center" href="${link("oversight", undefined, { ...Object.fromEntries(p), page: String(page - 1) })}">Newer</a>` : ""}
${(page + 1) * 25 < audit.total ? html`<a class="h-8 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high font-label-default text-label-default flex items-center" href="${link("oversight", undefined, { ...Object.fromEntries(p), page: String(page + 1) })}">Older</a>` : ""}
</nav></div></section>`;
}

function money(usd: number, rate: number): string {
  return `$${usd.toFixed(6)} · ₹${(usd * rate).toFixed(4)}`;
}

export function governanceView(g: Governance, runs: TaskRow[]): SafeHtml {
  return html`<section id="ai-governance" aria-labelledby="gov-title" class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">
<div><div class="flex items-center gap-space-xs flex-wrap">${icon("smart_toy", "text-primary text-[20px]")}<h2 id="gov-title" class="font-headline-md text-headline-md text-on-surface">AI Agent Governance</h2>
<span class="px-space-sm py-0.5 rounded-full ${g.enabled ? "bg-secondary-container text-on-secondary-fixed" : "bg-surface-container-high text-on-surface-variant"} font-label-compact text-label-compact font-semibold">${g.enabled ? "AI drafting on" : "AI drafting disabled"}</span>
${g.simulated_mode ? html`<span class="px-space-sm py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-compact text-label-compact font-semibold">Simulated provider where no key</span>` : ""}</div>
<p class="font-body-compact text-body-compact text-on-surface-variant">What every call costs, which model served it, and who changed what. ${editHint(g)}</p></div>
<div class="font-label-compact text-label-compact text-on-surface-variant">Keys: Gemini ${g.keys.gemini ? "set" : "not set"} · Anthropic ${g.keys.anthropic ? "set" : "not set"} · FX ₹${g.usd_inr_rate}/USD (placeholder)</div>
</div>
${totalsView(g)}
<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-md">${g.agents.map((a) => agentCard(a, g))}</div>
${ledgerTable(runs, g.usd_inr_rate)}
<details class="bg-surface-container-low rounded-lg p-space-sm"><summary class="font-label-default text-label-default cursor-pointer">Model price table (USD per 1M tokens)</summary>
<table class="w-full mt-space-sm font-body-compact text-body-compact"><caption class="sr-only">Model prices</caption><thead><tr class="text-left text-on-surface-variant"><th scope="col" class="py-1">Provider</th><th scope="col">Model</th><th scope="col" class="text-right">Input</th><th scope="col" class="text-right">Output</th><th scope="col" class="pl-space-md">Source</th></tr></thead>
<tbody>${g.prices.map((pr) => html`<tr><td class="py-0.5">${pr.provider}</td><td class="font-tabular-data">${pr.model}</td><td class="text-right font-tabular-data">$${pr.input.toFixed(2)}</td><td class="text-right font-tabular-data">$${pr.output.toFixed(2)}</td><td class="pl-space-md text-on-surface-variant">${pr.source} (${pr.as_of})</td></tr>`)}</tbody></table>
</details>
</section>`;
}

function agentCard(a: AgentGov, g: Governance): SafeHtml {
  const c = a.config;
  const lc = a.last_change;
  const ed = new Set(g.editable_fields ?? []);
  const d = (field: string) => raw(ed.has(field) ? "" : "disabled");
  const canBehaviour = ed.has("prompt");
  const sel = (name: string, options: string[], value: string) =>
    html`<select name="${name}" ${d(name)} class="h-8 px-space-xs rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact w-full">${options.map((o) => html`<option value="${o}" ${o === value ? raw("selected") : ""}>${o}</option>`)}</select>`;
  return html`<article id="agent-${a.agent_key}" class="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-sm" aria-labelledby="h-${a.agent_key}">
<div class="flex items-start justify-between gap-space-sm">
<div><h3 id="h-${a.agent_key}" class="font-headline-sm text-headline-sm">${a.display_name} <span class="font-label-compact text-label-compact text-on-surface-variant">v${a.version}</span></h3>
<p class="font-body-compact text-body-compact text-on-surface-variant">${a.description}</p></div>
<span class="px-space-sm py-0.5 rounded-full font-label-compact text-label-compact font-bold uppercase ${c.enabled ? "bg-secondary-container text-on-secondary-fixed" : "bg-error-container text-on-error-container"}">${c.enabled ? "On" : "Off"}</span>
</div>
<dl class="grid grid-cols-2 md:grid-cols-4 gap-space-xs font-body-compact text-body-compact">
${stat("LLM cost / task", `$${a.llm_cost_usd_per_task.toFixed(6)}`, `₹${a.llm_cost_inr_per_task.toFixed(4)}`)}
${stat("Tasks (ok / all)", `${a.tasks_ok} / ${a.tasks_total}`, `fallback ${a.fallback_share_pct}%`)}
${stat("Month spend", `$${a.month_spend_usd.toFixed(4)}`, `of $${c.monthly_budget_usd.toFixed(2)} budget`)}
${stat("Charges", `₹${a.task_based_charge_inr.toFixed(2)} task`, `₹${a.outcome_based_charge_inr.toFixed(2)} outcome (${a.outcomes_accepted})`)}
</dl>
<div class="font-label-compact text-label-compact text-on-surface-variant">Served by: ${Object.entries(a.served_by).map(([m, n]) => `${m} ×${n}`).join(" · ") || "no calls yet"}${a.circuit.primary_open ? " · PRIMARY CIRCUIT OPEN (skipping to fallback)" : ""}</div>
${lc ? html`<div class="p-space-sm rounded bg-surface-container-lowest font-body-compact text-body-compact"><strong>Last change v${lc.version}</strong> by ${lc.by}, ${timestamp(lc.at)}: ${lc.note} <span class="text-on-surface-variant">(${lc.fields.join(", ")})</span><br/>
<span class="text-primary font-semibold">Effective immediately: the next call reads this version. No deploy or restart.</span>
${lc.version > 1 && lc.first_call_at ? html`<br/><span class="text-on-surface-variant">First call on v${lc.version}: ${timestamp(lc.first_call_at)} (${humanDuration(lc.seconds_to_first_call ?? 0)} after the change, i.e. the next request).</span>` : lc.version > 1 ? html`<br/><span class="text-on-surface-variant">No call on v${lc.version} yet.</span>` : ""}</div>` : ""}
<form data-agent="${a.agent_key}" class="flex flex-col gap-space-sm" aria-label="Configure ${a.display_name}">
<fieldset class="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
<legend class="sr-only">Model routing</legend>
<label class="flex items-center gap-space-xs font-label-default text-label-default"><input type="checkbox" name="enabled" ${d("enabled")} ${c.enabled ? raw("checked") : ""} class="w-4 h-4 accent-primary"/> Agent enabled</label>
<label class="flex items-center gap-space-xs font-label-default text-label-default"><input type="checkbox" name="simulate_primary_outage" ${d("simulate_primary_outage")} ${c.simulate_primary_outage ? raw("checked") : ""} class="w-4 h-4 accent-primary"/> Drill: simulate primary outage</label>
<div class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Primary provider / model</span><div class="grid grid-cols-2 gap-1">${sel("primary_provider", Object.keys(g.catalogue), c.primary_provider)}${sel("primary_model", g.catalogue[c.primary_provider] ?? [], c.primary_model)}</div></div>
<div class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Fallback provider / model</span><div class="grid grid-cols-2 gap-1">${sel("fallback_provider", Object.keys(g.catalogue), c.fallback_provider)}${sel("fallback_model", g.catalogue[c.fallback_provider] ?? [], c.fallback_model)}</div></div>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Default tone</span>${sel("tone", g.tones, c.tone)}</label>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Timeout (seconds)</span><input name="timeout_seconds" ${d("timeout_seconds")} type="number" min="3" max="60" value="${c.timeout_seconds}" class="h-8 px-space-xs rounded bg-surface-container-lowest"/></label>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Task price (₹ per successful task)</span><input name="task_price_inr" ${d("task_price_inr")} type="number" step="0.01" min="0" value="${c.task_price_inr}" class="h-8 px-space-xs rounded bg-surface-container-lowest"/></label>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Outcome price (₹ when sent)</span><input name="outcome_price_inr" ${d("outcome_price_inr")} type="number" step="0.01" min="0" value="${c.outcome_price_inr}" class="h-8 px-space-xs rounded bg-surface-container-lowest"/></label>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Monthly budget (USD)</span><input name="monthly_budget_usd" ${d("monthly_budget_usd")} type="number" step="0.01" min="0" value="${c.monthly_budget_usd}" class="h-8 px-space-xs rounded bg-surface-container-lowest"/></label>
<label class="flex flex-col gap-1 md:col-span-2"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Prompt ({tone} is replaced; fixed guardrails are always appended and cannot be edited)</span><textarea name="prompt" ${d("prompt")} rows="6" minlength="50" maxlength="4000" class="p-space-xs rounded bg-surface-container-lowest font-body-compact text-body-compact">${c.prompt}</textarea></label>
${g.can_edit ? html`<label class="flex flex-col gap-1 md:col-span-2"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Reason for change (required, recorded)</span><input name="note" required minlength="3" maxlength="500" class="h-8 px-space-xs rounded bg-surface-container-lowest" placeholder="e.g. Cost review: switch primary to Flash-Lite"/></label>` : ""}
</fieldset>
<p class="form-error hidden text-error font-label-default text-label-default" role="alert"></p>
${g.can_edit ? html`<div class="flex justify-end"><button type="submit" class="h-8 px-space-md rounded bg-primary text-on-primary hover:bg-primary-container font-label-default text-label-default">Save as v${a.version + 1}</button></div>` : ""}
</form>
<details><summary class="font-label-default text-label-default cursor-pointer">Version history (${a.versions.length})</summary>
<ol class="mt-space-xs flex flex-col gap-space-xs font-body-compact text-body-compact">${a.versions.map((v) => html`<li class="p-space-xs rounded bg-surface-container-lowest flex flex-col gap-1">
<div class="flex items-center justify-between gap-space-xs flex-wrap"><span><strong>v${v.version}</strong> · ${timestamp(v.at)} · ${v.by}: ${v.note} <span class="text-on-surface-variant">(${v.fields.join(", ")})</span></span>
${canBehaviour && v.version !== a.version ? html`<button type="button" data-restore="${a.agent_key}:${v.version}" class="h-7 px-space-sm rounded bg-surface-container-high hover:bg-primary-container hover:text-on-primary font-label-compact text-label-compact">Restore v${v.version}</button>` : ""}</div>
<span class="font-label-compact text-label-compact text-on-surface-variant">${v.primary ?? ""} → fallback ${v.fallback ?? ""} · tone ${v.tone ?? ""}</span>
${v.prompt ? html`<details><summary class="font-label-compact text-label-compact text-primary cursor-pointer">Prompt in v${v.version}</summary><pre class="whitespace-pre-wrap p-space-xs rounded bg-surface-container-low">${v.prompt}</pre></details>` : ""}
</li>`)}</ol></details>
</article>`;
}

function editHint(g: Governance): string {
  const ed = new Set(g.editable_fields ?? []);
  if (ed.has("prompt")) return "As AI Agent Owner you change prompts, tone, models, fallback and timeout. Business controls (on/off, budget, prices) belong to the Credit Manager.";
  if (ed.has("enabled")) return "As Credit Manager you control on/off, budgets and prices. Prompts and models belong to the AI Agent Owner.";
  return "Read-only for your role.";
}

export function totalsView(g: Governance): SafeHtml {
  const t = g.totals;
  if (!t) return html``;
  const row = (label: string, a: Agg) => html`<tr class="border-t border-surface-container-high">
<th scope="row" class="py-1 pr-space-sm text-left font-medium">${label}</th>
<td class="text-right font-tabular-data">${a.tasks}</td><td class="text-right font-tabular-data">${a.calls}</td>
<td class="text-right font-tabular-data">${a.tokens.toLocaleString("en-IN")}</td>
<td class="text-right font-tabular-data font-semibold">$${a.llm_cost_usd.toFixed(6)}</td>
<td class="text-right font-tabular-data">₹${a.llm_cost_inr.toFixed(4)}</td>
<td class="text-right font-tabular-data">$${a.real_llm_cost_usd.toFixed(6)}</td>
<td class="text-right font-tabular-data">₹${a.task_based_inr.toFixed(2)}</td>
<td class="text-right font-tabular-data">₹${a.outcome_based_inr.toFixed(2)}</td></tr>`;
  return html`<div class="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-sm">
<div class="flex items-center justify-between flex-wrap gap-space-xs"><h3 class="font-headline-sm text-headline-sm flex items-center gap-space-xs">${icon("payments", "text-primary text-[20px]")}Cost incurred until now</h3>
<span class="font-label-compact text-label-compact text-on-surface-variant">"Real" excludes simulated calls. FX ₹${g.usd_inr_rate}/USD (placeholder).</span></div>
<div class="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
${stat("All-time LLM cost", `$${t.all_time.llm_cost_usd.toFixed(6)}`, `₹${t.all_time.llm_cost_inr.toFixed(4)} · ${t.all_time.calls} calls`)}
${stat("This month", `$${t.this_month.llm_cost_usd.toFixed(6)}`, `${t.this_month.tasks} tasks`)}
${stat("Real (billed) cost", `$${t.all_time.real_llm_cost_usd.toFixed(6)}`, `${t.all_time.simulated_calls} simulated calls excluded`)}
${stat("Task + outcome charges", `₹${(t.all_time.task_based_inr + t.all_time.outcome_based_inr).toFixed(2)}`, `₹${t.all_time.task_based_inr.toFixed(2)} task · ₹${t.all_time.outcome_based_inr.toFixed(2)} outcome`)}
</div>
<div class="overflow-x-auto"><table class="w-full font-body-compact text-body-compact" style="min-width:760px"><caption class="sr-only">Cost by agent and model</caption>
<thead><tr class="text-on-surface-variant font-label-compact text-label-compact uppercase"><th scope="col" class="text-left py-1">Breakdown</th><th scope="col" class="text-right">Tasks</th><th scope="col" class="text-right">Calls</th><th scope="col" class="text-right">Tokens</th><th scope="col" class="text-right">LLM USD</th><th scope="col" class="text-right">LLM INR</th><th scope="col" class="text-right">Real USD</th><th scope="col" class="text-right">Task ₹</th><th scope="col" class="text-right">Outcome ₹</th></tr></thead>
<tbody>${Object.entries(t.by_agent).map(([k, a]) => row(k === "reminder_rewriter" ? "Agent: Rewriter" : "Agent: Critic", a))}
${Object.entries(t.by_model).map(([k, a]) => row(`Model: ${k}`, a))}</tbody></table></div>
</div>`;
}

export function humanDuration(sec: number): string {
  if (sec < 90) return `${Math.round(sec)} s`;
  if (sec < 5400) return `${Math.round(sec / 60)} min`;
  if (sec < 172800) return `${(sec / 3600).toFixed(1)} h`;
  return `${Math.round(sec / 86400)} days`;
}

function stat(label: string, value: string, sub: string): SafeHtml {
  return html`<div class="p-space-xs rounded bg-surface-container-lowest"><dt class="font-label-compact text-label-compact uppercase text-on-surface-variant">${label}</dt><dd class="font-tabular-data text-tabular-data font-semibold">${value}</dd><dd class="font-label-compact text-label-compact text-on-surface-variant">${sub}</dd></div>`;
}

export function ledgerTable(runs: TaskRow[], rate: number): SafeHtml {
  return html`<div><h3 class="font-headline-sm text-headline-sm mb-space-xs">Cost ledger: every agent task and its calls</h3>
<p class="font-body-compact text-body-compact text-on-surface-variant mb-space-sm">One row per task. "Calls" lists each model attempt (primary, then fallback) with its own tokens and cost; the task cost is their sum.</p>
<div class="overflow-x-auto rounded-lg"><table class="w-full text-left border-collapse" style="min-width:1100px">
<caption class="sr-only">AI agent tasks with cost per call</caption>
<thead><tr class="bg-surface-container-high/60 text-on-surface-variant font-label-compact text-label-compact uppercase tracking-wider h-8">
<th scope="col" class="px-2">Time</th><th scope="col" class="px-2">Agent / task</th><th scope="col" class="px-2">App</th><th scope="col" class="px-2">By</th><th scope="col" class="px-2">Calls (route · model · status · tokens · cost · latency)</th><th scope="col" class="px-2 text-right">LLM cost</th><th scope="col" class="px-2 text-right">Task ₹</th><th scope="col" class="px-2">Outcome</th><th scope="col" class="px-2">Status</th>
</tr></thead>
<tbody class="divide-y divide-surface-container-high font-body-compact text-body-compact">
${runs.length ? runs.map(
  (t) => html`<tr class="align-top">
<td class="px-2 py-1.5 whitespace-nowrap font-tabular-data">${timestamp(t.created_at)}</td>
<td class="px-2 py-1.5">${t.agent_key === "reminder_rewriter" ? "Rewriter" : "Critic"} · ${t.task}${t.tone ? ` (${t.tone})` : ""}<br/><span class="text-on-surface-variant font-label-compact text-label-compact">config v${t.config_version}</span></td>
<td class="px-2 py-1.5 font-tabular-data text-primary">${t.application_id ?? "—"}</td>
<td class="px-2 py-1.5">${t.triggered_by}</td>
<td class="px-2 py-1.5"><ol class="flex flex-col gap-0.5">${t.attempts.map((a) => html`<li class="font-label-compact text-label-compact"><span class="font-semibold">${a.route}</span> · ${a.provider}/${a.model} · <span class="${a.status === "ok" ? "text-primary" : "text-error"} font-semibold">${a.status}</span>${a.error ? ` (${a.error})` : ""} · ${a.input_tokens}+${a.output_tokens} tok · $${a.cost_usd.toFixed(6)} · ${a.latency_ms}ms${a.simulated ? " · simulated" : ""}</li>`)}</ol></td>
<td class="px-2 py-1.5 text-right font-tabular-data whitespace-nowrap">${money(t.llm_cost_usd, rate)}</td>
<td class="px-2 py-1.5 text-right font-tabular-data">₹${t.task_price_inr.toFixed(2)}</td>
<td class="px-2 py-1.5">${t.outcome === "accepted" ? html`<span class="text-primary font-semibold">Accepted · ₹${t.outcome_price_inr.toFixed(2)}</span>` : t.outcome}</td>
<td class="px-2 py-1.5"><span class="px-2 py-0.5 rounded-full font-label-compact text-label-compact font-bold uppercase ${t.status === "ok" ? "bg-secondary-container text-on-secondary-fixed" : "bg-error-container text-on-error-container"}">${t.status === "ok" ? (t.used_fallback ? "OK · fallback" : "OK") : "Failed"}</span></td>
</tr>`,
) : html`<tr><td colspan="9" class="p-space-md text-center text-on-surface-variant">No agent calls yet.</td></tr>`}
</tbody></table></div></div>`;
}
