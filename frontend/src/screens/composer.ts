/** Screen C: Reminder composer. Markup from Design/reminder_composer_1/code.html.
 *  Changes: WhatsApp/SMS channels, Aadhaar eSign note, upload link, GSTIN, loan amount,
 *  "SOC2 / RBI-NBFC Compliant" badge, "verification velocity" widget and Branch-Head
 *  auto-escalation removed (spec: existing mail system only, no automatic actions).
 *  The widget slot now holds the AI assist panel (tone, reword, critique, cost of the call).
 *  The draft stays labelled "Draft for RM review" until approved by the named RM. */

import { api, ApiError, type AppDetail, type ReminderView } from "../api";
import { dayMonth, dayMonthYear, initials, timestamp } from "../format";
import { html, icon, raw, type SafeHtml } from "../html";
import { link, type Route } from "../router";
import type { Ctx } from "../main";
import { traceView, type Trace } from "../trace";

interface AgentTask {
  task_id: string;
  task: string;
  status: string;
  served_by: string | null;
  used_fallback: boolean;
  simulated: boolean;
  tone: string | null;
  config_version: number;
  attempts: { route: string; provider: string; model: string; status: string; error: string | null; input_tokens: number; output_tokens: number; cost_usd: number; latency_ms: number }[];
  tokens: number;
  llm_cost_usd: number;
  llm_cost_inr: number;
  task_price_inr: number;
  outcome: string;
  summary: string | null;
  created_at: string;
}
interface AgentsInfo {
  enabled: boolean;
  simulated_mode: boolean;
  tones: string[];
  agents: { agent_key: string; display_name: string; enabled?: boolean; tone?: string; config?: { enabled: boolean; tone: string } }[];
}

let pendingTrace: Trace | null = null;

export async function renderComposer(ctx: Ctx, route: Route): Promise<void> {
  if (!route.id) {
    const q = await api.get<{ rows: { id: string; draft: unknown }[] }>("/api/queue");
    const withDraft = q.rows.find((r) => r.draft) ?? q.rows[0];
    if (!withDraft) {
      ctx.root.innerHTML = html`<p class="p-space-lg">No applications in your view.</p>`.value;
      return;
    }
    window.location.replace(link("composer", withDraft.id));
    return;
  }
  const app = await api.get<AppDetail>(`/api/applications/${encodeURIComponent(route.id)}`);
  let r: ReminderView | null = null;
  try {
    r = await api.get<ReminderView>(`/api/applications/${app.id}/reminders/current`);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) throw e;
  }
  if (!r) {
    ctx.root.innerHTML = noDraft(app).value;
    ctx.root.querySelector("#create-draft")?.addEventListener("click", async () => {
      await api.post(`/api/applications/${app.id}/reminders`, {});
      await renderComposer(ctx, route);
    });
    ctx.root.querySelector<HTMLButtonElement>("#btn-chase-nodraft")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = "Agent running…";
      try {
        const res = await api.post<{ trace_id: string; total_cost_usd: number }>(`/api/applications/${app.id}/chase-agent`, {});
        pendingTrace = await api.get<Trace>(`/api/agent-traces/${res.trace_id}`);
        ctx.toast(`Document-chase agent finished · $${res.total_cost_usd.toFixed(6)}`);
      } catch (err) {
        ctx.toast(err instanceof ApiError ? err.message : "Agent run failed");
      }
      await renderComposer(ctx, route);
      document.getElementById("composer-trace")?.scrollIntoView({ block: "start" });
    });
    return;
  }
  const agentsInfo = await api.get<AgentsInfo>("/api/agents");
  const tasks = await api.get<AgentTask[]>(`/api/reminders/${r.id}/ai-tasks`).catch(() => [] as AgentTask[]);
  const traces = await api.get<Trace[]>(`/api/agent-traces?application_id=${app.id}&limit=5`).catch(() => [] as Trace[]);
  const state: State = { r, app, agentsInfo, tasks, traces, editing: false, openTrace: pendingTrace ?? undefined };
  pendingTrace = null;
  paint(ctx, state);
}

interface State {
  r: ReminderView;
  app: AppDetail;
  agentsInfo: AgentsInfo;
  tasks: AgentTask[];
  traces: Trace[];
  openTrace?: Trace;
  editing: boolean;
  lastTask?: AgentTask;
}

function paint(ctx: Ctx, s: State): void {
  ctx.root.innerHTML = view(ctx, s).value;
  wire(ctx, s);
}

function wire(ctx: Ctx, s: State): void {
  const root = ctx.root;
  const r = s.r;
  const patch = async (body: Record<string, unknown>) => {
    try {
      s.r = await api.patch<ReminderView>(`/api/reminders/${r.id}`, body);
      s.editing = false;
      paint(ctx, s);
    } catch (e) {
      ctx.toast(e instanceof ApiError ? e.message : "Could not update the draft");
      paint(ctx, s);
    }
  };
  root.querySelectorAll<HTMLInputElement>(".doc-checkbox").forEach((cb) =>
    cb.addEventListener("change", () => {
      const ids = [...root.querySelectorAll<HTMLInputElement>(".doc-checkbox:checked")].map((x) => Number(x.value));
      if (!ids.length) {
        cb.checked = true;
        ctx.toast("Keep at least one document in the reminder");
        return;
      }
      void patch({ item_ids: ids });
    }),
  );
  root.querySelector<HTMLSelectElement>("#tone-selector")?.addEventListener("change", (e) =>
    void patch({ round: Number((e.target as HTMLSelectElement).value) }),
  );
  root.querySelector<HTMLInputElement>("#due-date")?.addEventListener("change", (e) =>
    void patch({ due_date: (e.target as HTMLInputElement).value }),
  );
  root.querySelector("#btn-custom-notes")?.addEventListener("click", () => {
    s.editing = true;
    paint(ctx, s);
    ctx.root.querySelector<HTMLTextAreaElement>("#body-editor")?.focus();
  });
  root.querySelector("#btn-save-text")?.addEventListener("click", () =>
    void patch({ body: (root.querySelector("#body-editor") as HTMLTextAreaElement).value }),
  );
  root.querySelector("#btn-cancel-text")?.addEventListener("click", () => {
    s.editing = false;
    paint(ctx, s);
  });

  const runAgent = async (kind: "ai-reword" | "critique", btn: HTMLButtonElement) => {
    const tone = (root.querySelector("#ai-tone") as HTMLSelectElement | null)?.value;
    btn.disabled = true;
    btn.textContent = kind === "ai-reword" ? "Rewording…" : "Reviewing…";
    try {
      const res = await api.post<{ task: AgentTask; reminder?: ReminderView }>(`/api/reminders/${r.id}/${kind}`, { tone });
      if (res.reminder) s.r = res.reminder;
      s.lastTask = res.task;
      s.tasks = await api.get<AgentTask[]>(`/api/reminders/${r.id}/ai-tasks`);
      ctx.toast(`${kind === "ai-reword" ? "Reworded" : "Reviewed"} by ${res.task.served_by} · $${res.task.llm_cost_usd.toFixed(6)}`);
    } catch (e) {
      ctx.toast(e instanceof ApiError ? e.message : "AI request failed");
      s.tasks = await api.get<AgentTask[]>(`/api/reminders/${r.id}/ai-tasks`).catch(() => s.tasks);
    }
    paint(ctx, s);
  };
  root.querySelector<HTMLButtonElement>("#btn-ai-reword")?.addEventListener("click", (e) => void runAgent("ai-reword", e.currentTarget as HTMLButtonElement));
  root.querySelector<HTMLButtonElement>("#btn-ai-critique")?.addEventListener("click", (e) => void runAgent("critique", e.currentTarget as HTMLButtonElement));

  root.querySelector<HTMLButtonElement>("#btn-ai-chase")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const tone = (root.querySelector("#ai-tone") as HTMLSelectElement | null)?.value;
    btn.disabled = true;
    btn.textContent = "Agent running…";
    try {
      const res = await api.post<{ reminder: ReminderView; trace_id: string; total_cost_usd: number; status: string }>(
        `/api/applications/${s.app.id}/chase-agent`, { tone });
      s.r = res.reminder;
      s.openTrace = await api.get<Trace>(`/api/agent-traces/${res.trace_id}`);
      ctx.toast(`Document-chase agent ${res.status === "ok" ? "finished" : "finished with template fallback"} · $${res.total_cost_usd.toFixed(6)}`);
    } catch (err) {
      ctx.toast(err instanceof ApiError ? err.message : "Agent run failed");
    }
    s.tasks = await api.get<AgentTask[]>(`/api/reminders/${s.r.id}/ai-tasks`).catch(() => s.tasks);
    s.traces = await api.get<Trace[]>(`/api/agent-traces?application_id=${s.app.id}&limit=5`).catch(() => s.traces);
    paint(ctx, s);
    document.getElementById("composer-trace")?.scrollIntoView({ block: "start" });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-view-trace]").forEach((b) =>
    b.addEventListener("click", async () => {
      s.openTrace = await api.get<Trace>(`/api/agent-traces/${b.dataset.viewTrace}`);
      paint(ctx, s);
      document.getElementById("composer-trace")?.scrollIntoView({ block: "start" });
    }),
  );

  const modal = root.querySelector<HTMLDialogElement>("#signoff-modal");
  root.querySelector("#btn-approve-send")?.addEventListener("click", () => modal?.showModal());
  root.querySelector("#modal-cancel-btn")?.addEventListener("click", () => modal?.close());
  root.querySelector("#modal-close-btn")?.addEventListener("click", () => modal?.close());
  root.querySelector("#modal-confirm-btn")?.addEventListener("click", async () => {
    try {
      await api.post(`/api/reminders/${r.id}/approve-send`);
      modal?.close();
      ctx.toast("Reminder approved, sent (simulated e-mail) and logged");
      ctx.go(link("checklist", s.app.id));
    } catch (e) {
      modal?.close();
      ctx.toast(e instanceof ApiError ? e.message : "Could not send");
    }
  });

  const sched = root.querySelector<HTMLDialogElement>("#schedule-modal");
  root.querySelector("#btn-schedule")?.addEventListener("click", () => sched?.showModal());
  root.querySelector("#schedule-cancel")?.addEventListener("click", () => sched?.close());
  root.querySelector("#schedule-confirm")?.addEventListener("click", async () => {
    const v = (root.querySelector("#schedule-at") as HTMLInputElement).value;
    if (!v) return;
    const sendAt = new Date(`${v}:00+05:30`).toISOString();
    try {
      await api.post(`/api/reminders/${r.id}/schedule`, { send_at: sendAt });
      sched?.close();
      ctx.toast("Approved and scheduled. It will send at the chosen time.");
      ctx.go(link("checklist", s.app.id));
    } catch (e) {
      ctx.toast(e instanceof ApiError ? e.message : "Could not schedule");
    }
  });
}

function noDraft(app: AppDetail): SafeHtml {
  return html`<div class="max-w-2xl mx-auto mt-space-xl bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-md">
<h1 class="font-headline-md text-headline-md">Reminder Composer · ${app.id}</h1>
<p class="font-body-default text-body-default text-on-surface-variant">${app.client_name} has no open draft. ${app.outstanding_count ? `${app.outstanding_count} document(s) are outstanding.` : "Every document is received or waived."}</p>
<div class="flex gap-space-sm">
${app.outstanding_count && app.permissions.draft_reminder ? html`<button type="button" id="btn-chase-nodraft" class="h-8 px-space-md rounded bg-primary text-on-primary font-label-default text-label-default flex items-center gap-1.5">${icon("smart_toy")} Run document-chase agent</button>
<button type="button" id="create-draft" class="h-8 px-space-md rounded bg-surface-container-high text-on-surface font-label-default text-label-default">Create template draft only</button>` : ""}
<a class="h-8 px-space-md rounded bg-surface-container-high text-on-surface font-label-default text-label-default flex items-center" href="${link("checklist", app.id)}">Back to checklist</a>
</div></div>`;
}

const ROUND_TEXT: Record<number, string> = {
  1: "Reminder Round 1 — Gentle advisory (First notice)",
  2: "Reminder Round 2 — Firm, formal reminder",
  3: "Reminder Round 3 — Final notice",
};

function view(ctx: Ctx, s: State): SafeHtml {
  const r = s.r;
  const me = ctx.session.user;
  const isNamedRm = me.role === "rm" && me.id === r.named_rm.id;
  const selected = new Set(r.item_ids);
  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const ai = s.agentsInfo;
  const rewriterOn = ai.enabled && (ai.agents.find((a) => a.agent_key === "reminder_rewriter")?.enabled ?? ai.agents.find((a) => a.agent_key === "reminder_rewriter")?.config?.enabled ?? false);
  const criticOn = ai.enabled && (ai.agents.find((a) => a.agent_key === "reminder_critic")?.enabled ?? ai.agents.find((a) => a.agent_key === "reminder_critic")?.config?.enabled ?? false);
  const defaultTone = ai.agents.find((a) => a.agent_key === "reminder_rewriter")?.tone ?? "formal";
  const critique = s.tasks.find((t) => t.task === "critique" && t.status === "ok");

  return html`<div class="flex flex-col gap-space-sm mb-space-md">
<div class="flex items-center justify-between flex-wrap gap-space-sm">
<nav aria-label="Breadcrumb" class="flex items-center gap-space-xs text-on-surface-variant font-label-default text-label-default">
<a class="hover:text-primary transition-colors flex items-center gap-0.5 rounded" href="#/queue">${icon("folder_open")}<span>SME Queue</span></a>
${icon("chevron_right", "text-[14px] text-outline-variant")}
<a class="hover:text-primary transition-colors rounded" href="${link("checklist", r.application_id)}">${r.application_id}</a>
${icon("chevron_right", "text-[14px] text-outline-variant")}
<span class="text-on-surface font-semibold" aria-current="page">Reminder Composer (Dispatch Authorization)</span>
</nav>
<div class="flex items-center gap-1.5 px-space-sm py-1 rounded bg-secondary-container text-on-secondary-fixed font-label-compact text-label-compact">
<span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span><span>Session Actor: ${me.name} (${me.role_label})</span></div>
</div>
<div class="w-full bg-surface-container-highest/60 rounded-lg p-space-md flex items-start justify-between gap-space-md shadow-sm">
<div class="flex items-start gap-space-md">
<div class="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm mt-0.5">${icon("verified_user", "text-[20px]")}</div>
<div class="flex flex-col">
<div class="flex items-center gap-space-sm flex-wrap"><h1 class="font-headline-sm text-headline-sm text-on-surface tracking-tight">Draft for RM Review — Strict Human-in-the-Loop Protocol</h1>
<span class="px-space-sm py-0.5 rounded-full bg-error-container text-on-error-container font-label-compact text-label-compact uppercase tracking-wider font-semibold">Zero Autonomous Dispatch</span></div>
<p class="font-body-compact text-body-compact text-on-surface-variant mt-0.5">Drafts never send automatically. Only the named RM, <strong>${r.named_rm.name}</strong>, can approve this reminder to ${r.client_name}. The server enforces this.</p>
</div></div>
<div class="hidden xl:flex flex-col items-end text-right shrink-0"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase tracking-wider">Application</span><span class="font-tabular-data text-tabular-data font-semibold text-primary">${r.application_id} · ${r.product}</span></div>
</div></div>

<div class="w-full bg-surface-container-lowest rounded-xl p-space-md mb-space-md shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
<div class="flex items-center gap-space-md">
<div class="w-12 h-12 rounded-lg bg-surface-container-high text-primary flex items-center justify-center font-headline-md text-headline-md font-bold shrink-0" aria-hidden="true">${initials(r.client_name)}</div>
<div class="flex flex-col"><h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">${r.client_name}</h2>
<div class="flex items-center gap-space-md text-on-surface-variant font-body-compact text-body-compact mt-1 flex-wrap">
<span class="flex items-center gap-1">${icon("person", "text-[15px] text-on-surface-variant")}<strong class="text-on-surface">Contact:</strong> ${r.contact_name}</span>
<span class="text-outline-variant" aria-hidden="true">•</span>
<span class="flex items-center gap-1">${icon("mail", "text-[15px] text-on-surface-variant")}${r.contact_email}</span>
</div></div></div>
<div class="flex items-center gap-space-lg self-end lg:self-center bg-surface-container-low px-space-lg py-space-sm rounded-lg">
<div class="flex flex-col text-right"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase">Current Stage</span><span class="font-label-default text-label-default font-semibold text-tertiary">${s.app.stage_label}</span></div>
<div class="w-px h-8 bg-surface-container-high" aria-hidden="true"></div>
<div class="flex flex-col text-right"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase">Pending Checklist</span><span class="font-tabular-data text-tabular-data font-semibold text-error">${s.app.outstanding_count} of ${r.items_total} Docs Missing</span></div>
<div class="w-px h-8 bg-surface-container-high" aria-hidden="true"></div>
<div class="flex flex-col text-right"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase">Assigned RM</span><span class="font-label-default text-label-default font-medium text-on-surface">${r.named_rm.name}</span></div>
</div></div>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-space-md mb-space-xl">
<div class="lg:col-span-7 flex flex-col gap-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
<div class="flex items-center justify-between pb-space-sm mb-space-sm">
<div class="flex items-center gap-space-xs">${icon("checklist_rtl", "text-primary text-[20px]")}<h3 class="font-headline-sm text-headline-sm text-on-surface">1. Target Document Checklist</h3></div>
<span class="px-space-sm py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-compact text-label-compact font-semibold">${r.item_ids.length} Selected for Reminder</span>
</div>
<p class="font-body-compact text-body-compact text-on-surface-variant mb-space-md">Tick the outstanding documents to include. They are listed in the client message exactly as named. Changing the selection re-renders the template.</p>
<div class="flex flex-col gap-space-xs">
${r.outstanding_items.map(
  (it) => html`<label class="flex items-start gap-space-md p-space-md rounded-lg ${selected.has(it.id) ? "bg-surface-container-low" : "bg-surface-container-lowest opacity-90"} hover:bg-surface-container transition-colors cursor-pointer group">
<input ${selected.has(it.id) ? raw("checked") : ""} ${r.state !== "draft" ? raw("disabled") : ""} class="doc-checkbox mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer" type="checkbox" value="${it.id}"/>
<div class="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
<div class="flex flex-col"><span class="font-body-default text-body-default font-medium text-on-surface group-hover:text-primary transition-colors">${it.name}</span>
<span class="font-label-compact text-label-compact text-on-surface-variant">${it.category} · Owner: ${it.owner} · Requested ${dayMonth(it.requested_on)} · Round ${it.round}</span></div>
<span class="px-space-sm py-0.5 rounded-full font-label-compact text-label-compact font-semibold flex items-center gap-1 shrink-0 ${it.status === "overdue" ? "bg-error-container text-on-error-container" : it.status === "due_today" ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-surface-container text-on-surface-variant"}">${icon(it.status === "overdue" ? "schedule" : "alarm", "text-[12px]")}${it.status === "overdue" ? `Overdue · ${it.days_past_due} days` : it.status === "due_today" ? "Due Today" : `Due ${dayMonth(it.due_date)}`}</span>
</div></label>`,
)}
</div></div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div><div class="flex items-center gap-space-xs mb-space-xs">${icon("share", "text-primary text-[20px]")}<h3 class="font-headline-sm text-headline-sm text-on-surface">2. Dispatch Channel</h3></div>
<p class="font-body-compact text-body-compact text-on-surface-variant mb-space-md">Sent only through Kestrel's existing mail system after RM approval.</p>
<div class="flex items-start justify-between p-space-sm rounded-lg bg-surface-container-low">
<div class="flex items-start gap-space-sm"><div class="w-7 h-7 rounded bg-surface-container-highest text-primary flex items-center justify-center shrink-0 mt-0.5">${icon("mark_email_read")}</div>
<div class="flex flex-col"><span class="font-label-default text-label-default text-on-surface font-semibold">Official Email Delivery</span><span class="font-label-compact text-label-compact text-on-surface-variant">To: ${r.contact_email} · simulated in this prototype</span></div></div>
<span class="font-label-compact text-label-compact text-primary font-semibold">On</span>
</div></div></div>
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div><div class="flex items-center gap-space-xs mb-space-xs">${icon("tune", "text-primary text-[20px]")}<h3 class="font-headline-sm text-headline-sm text-on-surface">3. Escalation &amp; Due Date</h3></div>
<p class="font-body-compact text-body-compact text-on-surface-variant mb-space-md">Formality tier and unambiguous deadline.</p>
<div class="flex flex-col gap-space-xs mb-space-md"><label for="tone-selector" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Template Escalation Round</label>
<div class="relative"><select ${r.state !== "draft" ? raw("disabled") : ""} class="w-full h-8 pl-space-sm pr-8 rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact appearance-none cursor-pointer" id="tone-selector">
${[1, 2, 3].map((n) => html`<option value="${n}" ${n === r.round ? raw("selected") : ""}>${ROUND_TEXT[n]}</option>`)}
</select><span class="material-symbols-outlined absolute right-2 top-2 text-[16px] pointer-events-none text-on-surface-variant" aria-hidden="true">expand_more</span></div></div>
<div class="flex flex-col gap-space-xs"><label for="due-date" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Submission Deadline</label>
<input id="due-date" type="date" min="${today}" value="${r.due_date}" ${r.state !== "draft" ? raw("disabled") : ""} class="w-full h-8 px-space-sm rounded bg-surface-container-low text-primary font-tabular-data text-tabular-data font-medium"/>
<span class="font-label-compact text-label-compact text-on-surface-variant">${r.due_label}</span></div>
</div>
<div class="mt-space-md p-space-sm rounded bg-surface-container-low flex flex-col"><span class="font-label-compact text-label-compact text-on-surface-variant">Client contact for questions</span><span class="font-tabular-data text-tabular-data font-semibold text-on-surface">RM ${r.named_rm.name}</span></div>
</div></div>

${aiPanel(s, rewriterOn, criticOn, defaultTone, critique)}
</div>

<div class="lg:col-span-5 flex flex-col gap-space-md">
<div class="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden flex flex-col">
<div class="bg-surface-container-highest px-space-md py-space-sm flex items-center justify-between">
<div class="flex items-center gap-space-xs"><span class="w-2 h-2 rounded-full bg-error" aria-hidden="true"></span><span class="font-label-compact text-label-compact uppercase tracking-widest font-bold text-on-surface">${r.state === "draft" ? "Draft for RM review (not sent)" : r.state === "scheduled" ? "Approved · scheduled" : "Sent"}</span></div>
<div class="flex items-center gap-1 text-on-surface-variant font-label-compact text-label-compact">${icon("preview", "text-[14px]")}<span>Revision ${r.revision}${r.ai_assisted ? " · AI-assisted wording" : r.edited_text ? " · edited by hand" : " · template"}</span></div>
</div>
<div class="p-space-lg bg-surface-container-lowest flex flex-col gap-space-md">
<div class="rounded-xl p-space-md bg-surface-container-low text-on-surface flex flex-col gap-space-sm shadow-sm">
<div class="flex items-center justify-between pb-space-xs"><div class="flex items-center gap-space-xs">${icon("mail", "text-primary text-[18px]")}<span class="font-label-default text-label-default font-semibold text-on-surface">Email body</span></div>
<span class="font-tabular-data text-tabular-data text-on-surface-variant text-[11px]">To: ${r.contact_email}</span></div>
${s.editing
  ? html`<label for="body-editor" class="sr-only">Reminder text</label><textarea id="body-editor" rows="16" class="w-full p-space-sm rounded bg-surface-container-lowest text-on-surface font-body-compact text-body-compact">${r.body}</textarea>
<div class="flex justify-end gap-space-xs"><button type="button" id="btn-cancel-text" class="h-8 px-space-md rounded bg-surface-container font-label-default text-label-default">Cancel</button><button type="button" id="btn-save-text" class="h-8 px-space-md rounded bg-primary text-on-primary font-label-default text-label-default">Save text</button></div>`
  : html`<div class="font-body-compact text-body-compact text-on-surface leading-relaxed whitespace-pre-wrap" id="message-text-target">${r.body}</div>`}
</div>
<div class="p-space-md rounded-lg bg-surface-container-high/60 text-on-surface flex items-start gap-space-sm">${icon("lock_clock", "text-primary text-[18px] shrink-0 mt-0.5")}
<div class="flex flex-col"><span class="font-label-default text-label-default font-semibold text-on-surface">Audit trail</span>
<p class="font-body-compact text-body-compact text-on-surface-variant mt-0.5">Approving records a permanent, hash-chained entry in the application timeline with RM <strong>${r.named_rm.name}</strong> as the approving actor. A sent reminder cannot be recalled.</p></div></div>
</div></div>
</div></div>

<div class="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-md flex flex-col md:flex-row items-center justify-between gap-space-md mb-space-lg">
<div class="flex items-center gap-space-sm w-full md:w-auto">
<a class="h-8 px-space-md rounded bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors font-body-default text-body-default font-medium flex items-center gap-1.5 justify-center" href="${link("checklist", r.application_id)}">${icon("arrow_back")}<span>Cancel &amp; Return to Checklist</span></a>
${r.state === "draft" ? html`<button type="button" class="h-8 px-space-md rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-body-default text-body-default font-medium flex items-center gap-1.5" id="btn-custom-notes">${icon("edit_note")}<span>Edit Text</span></button>` : ""}
</div>
<div class="flex items-center gap-space-sm w-full md:w-auto justify-end flex-wrap">
${r.state !== "draft"
  ? html`<span class="font-body-compact text-body-compact text-on-surface-variant">${r.state === "scheduled" ? `Approved by ${r.approved_by}; sends ${r.scheduled_for ? timestamp(r.scheduled_for) : ""}` : `Sent ${r.sent_at ? timestamp(r.sent_at) : ""}`}</span>`
  : isNamedRm
    ? html`<button type="button" class="h-8 px-space-md rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-body-default text-body-default font-medium flex items-center gap-1.5" id="btn-schedule">${icon("schedule_send")}<span>Approve &amp; Schedule</span></button>
<button type="button" class="h-8 px-space-lg rounded bg-primary text-on-primary hover:bg-primary-container transition-all font-body-default text-body-default font-semibold flex items-center gap-space-xs shadow-sm" id="btn-approve-send">${icon("verified", "text-[18px]")}<span>Approve and Send Now (RM Sign-off)</span></button>`
    : html`<span class="font-body-compact text-body-compact text-on-surface-variant flex items-center gap-1">${icon("lock")} Only ${r.named_rm.name} can approve and send this reminder.</span>`}
</div></div>

<dialog id="signoff-modal" aria-labelledby="signoff-title" class="rounded-xl p-0 max-w-lg w-full bg-surface-container-lowest text-on-surface shadow-xl">
<div class="p-space-xl flex flex-col gap-space-md">
<div class="flex items-start justify-between"><div class="flex items-center gap-space-sm"><div class="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">${icon("fingerprint", "text-[22px]")}</div>
<div class="flex flex-col"><h2 id="signoff-title" class="font-headline-sm text-headline-sm text-on-surface">Confirm RM Authorization &amp; Dispatch</h2><span class="font-label-compact text-label-compact text-on-surface-variant">This cannot be recalled once sent</span></div></div>
<button type="button" class="text-on-surface-variant hover:text-on-surface p-1 rounded" id="modal-close-btn" aria-label="Close">${icon("close", "text-[20px]")}</button></div>
<div class="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs font-body-compact text-body-compact">
<div class="flex justify-between"><span class="text-on-surface-variant">Client:</span><span class="font-semibold">${r.client_name}</span></div>
<div class="flex justify-between"><span class="text-on-surface-variant">Channel:</span><span class="font-semibold">Email (simulated)</span></div>
<div class="flex justify-between"><span class="text-on-surface-variant">Documents requested:</span><span class="font-semibold text-primary">${r.item_ids.length} documents</span></div>
<div class="flex justify-between"><span class="text-on-surface-variant">Deadline:</span><span class="font-tabular-data font-semibold">${dayMonthYear(r.due_date)}</span></div>
</div>
<div class="p-space-sm rounded bg-surface-container-high/50 text-on-surface-variant font-label-compact text-label-compact flex items-center gap-1.5">${icon("gavel", "text-primary")}<span>Logged with ${me.name} as approving RM. No automated retry.</span></div>
<div class="flex items-center justify-end gap-space-sm pt-space-xs">
<button type="button" class="h-8 px-space-md rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-body-default text-body-default font-medium" id="modal-cancel-btn">Cancel &amp; Edit</button>
<button type="button" class="h-8 px-space-lg rounded bg-primary text-on-primary hover:bg-primary-container font-body-default text-body-default font-semibold flex items-center gap-1" id="modal-confirm-btn">${icon("send")}<span>Execute RM Dispatch</span></button>
</div></div></dialog>

<dialog id="schedule-modal" aria-labelledby="schedule-title" class="rounded-xl p-0 max-w-md w-full bg-surface-container-lowest text-on-surface shadow-xl">
<div class="p-space-xl flex flex-col gap-space-md">
<h2 id="schedule-title" class="font-headline-sm text-headline-sm">Approve now, send later</h2>
<p class="font-body-compact text-body-compact text-on-surface-variant">Your approval is recorded now. The reminder is sent at the time you choose (IST, within 14 days).</p>
<label for="schedule-at" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Send at (IST)</label>
<input id="schedule-at" type="datetime-local" class="h-8 px-space-sm rounded bg-surface-container-low"/>
<div class="flex justify-end gap-space-sm"><button type="button" id="schedule-cancel" class="h-8 px-space-md rounded bg-surface-container font-label-default text-label-default">Cancel</button><button type="button" id="schedule-confirm" class="h-8 px-space-md rounded bg-primary text-on-primary font-label-default text-label-default">Approve &amp; schedule</button></div>
</div></dialog>`;
}

function aiPanel(s: State, rewriterOn: boolean, criticOn: boolean, defaultTone: string, critique?: AgentTask): SafeHtml {
  const ai = s.agentsInfo;
  const last = s.lastTask ?? s.tasks[0];
  const disabledMsg = !ai.enabled ? "AI drafting disabled" : "";
  let critiqueData: { score: number; verdict: string; issues: string[] } | null = null;
  if (critique?.summary) {
    try {
      critiqueData = JSON.parse(critique.summary.slice(critique.summary.indexOf("{"), critique.summary.lastIndexOf("}") + 1));
    } catch {
      critiqueData = null;
    }
  }
  return html`<section aria-labelledby="ai-title" class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div class="flex items-center justify-between flex-wrap gap-space-xs">
<div class="flex items-center gap-space-xs">${icon("auto_awesome", "text-primary text-[20px]")}<h3 id="ai-title" class="font-headline-sm text-headline-sm text-on-surface">4. AI assist (optional)</h3></div>
${ai.simulated_mode ? html`<span class="px-space-sm py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-compact text-label-compact font-bold uppercase">Simulated provider · no real cost</span>` : ""}
</div>
${disabledMsg
  ? html`<p class="p-space-sm rounded bg-surface-container-low font-body-compact text-body-compact text-on-surface-variant">${disabledMsg}. The reminder uses the approved template only.</p>`
  : html`<p class="font-body-compact text-body-compact text-on-surface-variant"><strong>Document-chase agent:</strong> reads the outstanding documents, drafts from the approved template, rewords it, has the critic review it, revises once if needed, and hands the draft to the named RM. It cannot send. The rewriter rewords the text only; the result stays a draft for the named RM. Client and contact names are replaced with placeholders before any model call. Every call is costed and logged.</p>
<div class="flex flex-wrap items-end gap-space-sm">
<div class="flex flex-col gap-space-xs"><label for="ai-tone" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Tone</label>
<select id="ai-tone" class="h-8 pl-space-sm pr-6 rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact">${ai.tones.map((t) => html`<option value="${t}" ${t === defaultTone ? raw("selected") : ""}>${t[0]!.toUpperCase() + t.slice(1)}</option>`)}</select></div>
<button type="button" id="btn-ai-chase" ${!rewriterOn || s.r.state !== "draft" ? raw("disabled") : ""} class="h-8 px-space-md rounded bg-primary text-on-primary hover:bg-primary-container font-label-default text-label-default flex items-center gap-1.5 disabled:opacity-50">${icon("smart_toy")} Run document-chase agent</button>
<button type="button" id="btn-ai-reword" ${!rewriterOn || s.r.state !== "draft" ? raw("disabled") : ""} class="h-8 px-space-md rounded bg-primary-container text-on-primary hover:bg-primary font-label-default text-label-default flex items-center gap-1.5 disabled:opacity-50">${icon("edit")} Reword with AI</button>
<button type="button" id="btn-ai-critique" ${!criticOn ? raw("disabled") : ""} class="h-8 px-space-md rounded bg-surface-container-high text-on-surface hover:bg-surface-variant font-label-default text-label-default flex items-center gap-1.5 disabled:opacity-50">${icon("rate_review")} Run critique</button>
${!rewriterOn ? html`<span class="font-label-compact text-label-compact text-error">Rewriter switched off by the Credit Manager</span>` : ""}
</div>`}
${last ? taskCard(last) : ""}
${s.traces.length ? html`<div class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Agent traces for this file</span>
<ul class="flex flex-col gap-1">${s.traces.map((t) => html`<li class="flex items-center justify-between gap-space-xs p-space-xs rounded bg-surface-container-low font-body-compact text-body-compact">
<span>${t.kind === "pipeline" ? "Document-chase agent" : t.agent_key === "reminder_critic" ? "Critic" : "Rewriter"} · ${timestamp(t.created_at)} · ${t.triggered_by} · <span class="font-tabular-data">$${t.total_cost_usd.toFixed(6)}</span></span>
<button type="button" data-view-trace="${t.task_id}" class="h-7 px-space-sm rounded bg-surface-container-high font-label-compact text-label-compact">View trace</button></li>`)}</ul></div>` : ""}
<div id="composer-trace">${s.openTrace ? traceView(s.openTrace, s.openTrace.kind === "pipeline" ? "Document-chase agent run" : "Agent task") : ""}</div>
${critiqueData
  ? html`<div class="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1">
<div class="flex items-center justify-between"><span class="font-label-default text-label-default font-semibold">Critique: ${critiqueData.score}/5 · ${critiqueData.verdict === "ok" ? "OK to send" : "Revise suggested"}</span><span class="font-label-compact text-label-compact text-on-surface-variant">${critique ? critique.served_by : ""}</span></div>
${critiqueData.issues.length ? html`<ul class="list-disc pl-5 font-body-compact text-body-compact text-on-surface-variant">${critiqueData.issues.map((i) => html`<li>${i}</li>`)}</ul>` : html`<span class="font-body-compact text-body-compact text-on-surface-variant">No issues found.</span>`}
</div>`
  : ""}
</section>`;
}

function taskCard(t: AgentTask): SafeHtml {
  return html`<div class="p-space-sm rounded-lg ${t.status === "ok" ? "bg-surface-container-low" : "bg-error-container/40"} flex flex-col gap-1">
<div class="flex items-center justify-between flex-wrap gap-1">
<span class="font-label-default text-label-default font-semibold">Last AI task: ${t.task === "reword" ? "Reword" : "Critique"} · ${t.status === "ok" ? `served by ${t.served_by}` : "failed, template kept"}${t.used_fallback ? " (fallback)" : ""}</span>
<span class="font-tabular-data text-tabular-data font-semibold text-primary">LLM cost $${t.llm_cost_usd.toFixed(6)} · ₹${t.llm_cost_inr.toFixed(4)}${t.simulated ? " (simulated)" : ""}</span>
</div>
<span class="font-label-compact text-label-compact text-on-surface-variant">${timestamp(t.created_at)} · ${t.tokens} tokens · config v${t.config_version} · task price ₹${t.task_price_inr.toFixed(2)} · ${t.attempts.map((a) => `${a.route}: ${a.provider}/${a.model} ${a.status}${a.error ? ` (${a.error})` : ""} ${a.latency_ms}ms`).join(" → ")}</span>
</div>`;
}
