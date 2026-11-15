/** Screen B: Application checklist & timeline. Markup from
 *  Design/application_checklist_timeline_1/code.html.
 *  Changes: CIBIL score, loan amount, CIN, GSTIN, account numbers, turnover, CC limit, UDIN,
 *  "View PDF", "284 Txns", "Download Pack", portal auto-verification and the "Legal Search"
 *  milestone removed. Filter "Verified" renamed "Received" and "Pending" renamed "Requested"
 *  (spec states). Blocker panel lists the real blocking items. Client contact card shows the
 *  contact name only (no phone/e-mail links). */

import { api, ApiError, type AppDetail, type Item, type ReminderView, type TimelineEvent } from "../api";
import { dayMonth, dayMonthYear, relativeDay, timestamp } from "../format";
import { html, icon, type SafeHtml } from "../html";
import { link, type Route } from "../router";
import { ITEM_CHIP } from "../status";
import type { Ctx } from "../main";

const GROUP_ICONS: Record<string, string> = {
  "Identity and Constitution": "shield_person",
  "Bank Statements": "account_balance",
  "GST Returns": "receipt_long",
  "Financial Statements": "query_stats",
  "Other Documents": "folder_special",
};

export async function firstVisibleApp(ctx: Ctx): Promise<string | null> {
  if (ctx.session.user.role === "analyst") {
    const files = await api.get<{ id: string }[]>("/api/analyst/files");
    return files[0]?.id ?? null;
  }
  const q = await api.get<{ rows: { id: string }[] }>("/api/queue");
  return q.rows[0]?.id ?? null;
}

export async function renderChecklist(ctx: Ctx, route: Route): Promise<void> {
  if (!route.id) {
    const id = await firstVisibleApp(ctx);
    if (!id) {
      ctx.root.innerHTML = html`<p class="p-space-lg">No applications in your view.</p>`.value;
      return;
    }
    window.location.replace(link("checklist", id));
    return;
  }
  const d = await api.get<AppDetail>(`/api/applications/${encodeURIComponent(route.id)}`);
  const filter = route.params.get("filter") ?? "all";
  ctx.root.innerHTML = view(d, filter, ctx.session.user.role).value;
  wire(ctx, d, filter);
}

function wire(ctx: Ctx, d: AppDetail, filter: string): void {
  const root = ctx.root;
  const reload = () => renderChecklist(ctx, { screen: "checklist", id: d.id, params: new URLSearchParams({ filter }) });

  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-filter]")) {
    b.addEventListener("click", () => ctx.go(link("checklist", d.id, b.dataset.filter === "all" ? undefined : { filter: b.dataset.filter! })));
  }
  root.querySelector("#history-toggle")?.addEventListener("click", (e) => {
    root.querySelectorAll("[data-extra-event]").forEach((el) => el.classList.remove("hidden"));
    (e.currentTarget as HTMLElement).remove();
  });

  const draftFor = async (itemIds?: number[]) => {
    try {
      await api.post<ReminderView>(`/api/applications/${d.id}/reminders`, itemIds ? { item_ids: itemIds } : {});
      ctx.go(link("composer", d.id));
    } catch (err) {
      ctx.toast(err instanceof ApiError ? err.message : "Could not create the draft");
    }
  };
  root.querySelector("#btn-request-all")?.addEventListener("click", () => void draftFor());

  root.addEventListener("click", async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.item);
    const action = btn.dataset.action;
    if (action === "draft") return void draftFor([id]);
    if (action === "receive") {
      btn.disabled = true;
      try {
        await api.post(`/api/applications/${d.id}/items/${id}/receive`);
        ctx.toast("Marked received and logged");
        await reload();
      } catch (err) {
        btn.disabled = false;
        ctx.toast(err instanceof ApiError ? err.message : "Could not mark received");
      }
    }
    if (action === "waive") openWaive(ctx, d, id, reload);
  });
}

function openWaive(ctx: Ctx, d: AppDetail, itemId: number, reload: () => Promise<void>): void {
  const item = d.groups.flatMap((g) => g.items).find((i) => i.id === itemId)!;
  const dlg = document.createElement("dialog");
  dlg.className = "rounded-xl p-0 max-w-lg w-full bg-surface-container-lowest text-on-surface shadow-xl";
  dlg.setAttribute("aria-labelledby", "waive-title");
  dlg.innerHTML = html`<form method="dialog" class="p-space-xl flex flex-col gap-space-md">
<h2 id="waive-title" class="font-headline-sm text-headline-sm">Waive item</h2>
<p class="font-body-compact text-body-compact text-on-surface-variant">${item.name}. A waiver needs a recorded reason; it is written to the immutable event log with your name.</p>
<label for="waive-reason" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Reason (required)</label>
<textarea id="waive-reason" required minlength="5" maxlength="500" rows="3" class="p-space-sm rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact"></textarea>
<p id="waive-error" role="alert" class="hidden text-error font-label-default text-label-default"></p>
<div class="flex justify-end gap-space-sm">
<button type="button" data-cancel class="h-8 px-space-md rounded bg-surface-container hover:bg-surface-container-high font-body-default text-body-default">Cancel</button>
<button type="submit" class="h-8 px-space-md rounded bg-primary text-on-primary hover:bg-primary-container font-body-default text-body-default font-semibold">Record waiver</button>
</div></form>`.value;
  document.body.append(dlg);
  dlg.addEventListener("close", () => dlg.remove());
  dlg.querySelector("[data-cancel]")!.addEventListener("click", () => dlg.close());
  dlg.querySelector("form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const reason = (dlg.querySelector("#waive-reason") as HTMLTextAreaElement).value.trim();
    const err = dlg.querySelector("#waive-error")!;
    if (reason.length < 5) {
      err.textContent = "Enter a reason of at least 5 characters.";
      err.classList.remove("hidden");
      return;
    }
    try {
      await api.post(`/api/applications/${d.id}/items/${itemId}/waive`, { reason });
      dlg.close();
      ctx.toast("Waiver recorded");
      await reload();
    } catch (ex) {
      err.textContent = ex instanceof ApiError ? ex.message : "Could not record the waiver";
      err.classList.remove("hidden");
    }
  });
  dlg.showModal();
}

function matchesFilter(i: Item, f: string): boolean {
  if (f === "overdue") return i.status === "overdue";
  if (f === "requested") return i.state === "requested";
  if (f === "received") return i.status === "received" || i.status === "waived";
  return true;
}

function view(d: AppDetail, filter: string, role: string): SafeHtml {
  const all = d.groups.flatMap((g) => g.items);
  const done = d.items_done;
  const pct = d.items_total ? Math.round((done / d.items_total) * 100) : 0;
  const counts = {
    all: all.length,
    overdue: all.filter((i) => i.status === "overdue").length,
    requested: all.filter((i) => i.state === "requested").length,
    received: all.filter((i) => i.state !== "requested").length,
  };
  const p = d.permissions;
  return html`<!-- Breadcrumbs & Meta Bar -->
<div class="flex items-center justify-between pb-space-sm">
<nav aria-label="Breadcrumb" class="flex items-center gap-space-xs text-on-surface-variant font-label-default text-label-default">
${role === "analyst"
  ? html`<a class="hover:text-primary transition-colors flex items-center gap-1 rounded" href="${link("analyst", d.id)}">${icon("arrow_back")} Analyst file</a>`
  : html`<a class="hover:text-primary transition-colors flex items-center gap-1 rounded" href="#/queue">${icon("arrow_back")} Applications</a>`}
<span class="text-outline-variant font-normal" aria-hidden="true">/</span>
<span class="font-tabular-data text-tabular-data text-on-surface">${d.id}</span>
<span class="text-outline-variant font-normal" aria-hidden="true">/</span>
<span class="text-on-surface font-semibold" aria-current="page">${d.client_name}</span>
</nav>
<div class="flex items-center gap-space-sm text-on-surface-variant font-label-compact text-label-compact">
<span class="flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container text-on-surface"><span class="w-1.5 h-1.5 rounded-full bg-primary-container" aria-hidden="true"></span>${d.applicant_type}</span>
<span class="text-outline-variant" aria-hidden="true">•</span><span>${d.city}</span>
</div></div>

<!-- Application Overview Banner -->
<section class="bg-surface-container-lowest rounded-xl p-space-lg mb-space-md shadow-sm">
<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
<div class="flex flex-col gap-space-xs">
<div class="flex flex-wrap items-center gap-space-sm">
<h1 class="font-headline-md text-headline-md text-on-surface tracking-tight">${d.client_name}</h1>
<span class="px-space-sm py-0.5 rounded bg-secondary-container text-on-secondary-fixed font-label-compact text-label-compact font-bold uppercase tracking-wider">Sub-₹25L · ${d.loan_band}</span>
<span class="px-space-sm py-0.5 rounded-full font-label-compact text-label-compact font-bold uppercase tracking-wider ${d.status === "overdue" ? "bg-error-container text-on-error-container" : d.status === "due_today" ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : d.status === "complete" ? "bg-secondary-container text-on-secondary-fixed" : "bg-surface-container-high text-on-surface"}">${d.status_label}</span>
</div>
<div class="flex flex-wrap items-center gap-x-space-lg gap-y-1 text-on-surface-variant font-body-compact text-body-compact">
<div class="flex items-center gap-1">${icon("payments", "text-[15px] text-primary")}<span class="font-medium text-on-surface">${d.product}</span></div>
<div class="flex items-center gap-1">${icon("badge", "text-[15px] text-secondary")}<span>RM: <strong class="text-on-surface font-medium">${d.rm.name}</strong></span></div>
<div class="flex items-center gap-1">${icon("schedule", "text-[15px] text-on-surface-variant")}<span>Opened: <strong>${dayMonthYear(d.opened_on)}</strong> <span class="${d.status === "overdue" ? "text-error" : ""} font-medium">(${d.age_days} days open)</span></span></div>
</div></div>
<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md">
<div class="bg-surface-container-low px-space-md py-space-sm rounded-lg flex items-center gap-space-md">
<div class="relative w-11 h-11 flex items-center justify-center" role="img" aria-label="${done} of ${d.items_total} items received or waived">
<svg class="w-11 h-11 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
<path class="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3.5"></path>
<path class="text-primary-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="${pct}, 100" stroke-linecap="round" stroke-width="3.5"></path>
</svg><span class="absolute font-label-default text-label-default text-on-surface font-bold">${done}/${d.items_total}</span></div>
<div class="flex flex-col"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase tracking-wider">Completion</span>
<div class="flex items-center gap-1 text-on-surface font-label-default text-label-default">
<span class="text-error font-bold">${d.overdue_count} Overdue</span><span class="text-outline-variant" aria-hidden="true">•</span><span class="text-tertiary-container font-medium">${d.due_today_count} Due today</span>
</div></div></div>
${p.draft_reminder && d.outstanding_count
  ? html`<div class="flex items-center gap-space-xs">
<button type="button" class="h-9 px-space-md rounded bg-primary-container hover:bg-primary text-on-primary font-label-default text-label-default flex items-center gap-1.5 transition-all shadow-sm" id="btn-request-all">${icon("bolt")}<span>${d.draft ? "Open Reminder Draft" : "Request All Outstanding"}</span><span class="px-1 rounded bg-surface-container-lowest/20 font-label-compact text-label-compact text-on-primary">${d.draft ? d.draft.items : d.outstanding_count}</span></button>
</div>`
  : ""}
</div></div></section>

<div class="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
<div class="xl:col-span-8 flex flex-col gap-space-md">
<div class="bg-surface-container-lowest rounded-lg p-space-sm px-space-md flex flex-wrap items-center justify-between gap-space-sm shadow-sm">
<div class="flex items-center gap-space-xs font-label-default text-label-default text-on-surface" role="group" aria-label="Filter view">
<span class="font-semibold uppercase tracking-wider text-on-surface-variant">Filter View:</span>
${(
  [
    ["all", `All (${counts.all})`],
    ["overdue", `Overdue (${counts.overdue})`],
    ["requested", `Requested (${counts.requested})`],
    ["received", `Received / Waived (${counts.received})`],
  ] as [string, string][]
).map(([k, t]) =>
  k === filter
    ? html`<button type="button" data-filter="${k}" aria-pressed="true" class="px-space-sm py-1 rounded bg-primary text-on-primary font-medium">${t}</button>`
    : html`<button type="button" data-filter="${k}" aria-pressed="false" class="px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant">${t}</button>`,
)}
</div>
<div class="flex items-center gap-space-sm font-label-compact text-label-compact text-on-surface-variant"><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-error" aria-hidden="true"></span> Overdue = past the due date by the configured threshold</span></div>
</div>
${d.groups.map((g, gi) => groupView(g, gi, filter, p))}
</div>

<div class="xl:col-span-4 flex flex-col gap-space-md">
${blockerPanel(d)}
${timelinePanel(d.timeline)}
<div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex items-center justify-between">
<div class="flex items-center gap-space-sm">
<div class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold font-label-default text-label-default" aria-hidden="true">${d.contact_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>
<div class="flex flex-col"><span class="font-label-default text-label-default text-on-surface font-semibold">${d.contact_name}</span><span class="font-body-compact text-body-compact text-on-surface-variant">Client contact (fictitious)</span></div>
</div>
<span class="font-label-compact text-label-compact text-on-surface-variant">Contact via RM ${d.rm.name}</span>
</div>
</div></div>`;
}

function groupView(g: AppDetail["groups"][number], gi: number, filter: string, p: AppDetail["permissions"]): SafeHtml {
  const items = g.items.filter((i) => matchesFilter(i, filter));
  if (!items.length) return html``;
  const badge = g.overdue
    ? html`<span class="px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-label-compact text-label-compact font-semibold">${g.done} of ${g.total} Complete · ${g.overdue} Overdue</span>`
    : html`<span class="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-compact text-label-compact font-semibold">${g.done} of ${g.total} Complete</span>`;
  const right =
    g.done === g.total
      ? html`<span class="px-space-sm py-0.5 rounded bg-surface-container-highest/60 text-on-surface font-label-compact text-label-compact">Round ${g.max_round} Cleared</span>`
      : html`<span class="text-on-surface-variant font-label-compact text-label-compact">Request round ${g.max_round}</span>`;
  return html`<div class="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
<div class="bg-surface-container-low px-space-md py-space-sm flex items-center justify-between">
<div class="flex items-center gap-space-sm">${icon(GROUP_ICONS[g.name] ?? "folder", "text-primary text-[18px]")}<h2 class="font-headline-sm text-headline-sm text-on-surface">${gi + 1}. ${g.name}</h2>${badge}</div>
${right}
</div>
${items.map((i) => itemRow(i, p))}
</div>`;
}

function itemRow(i: Item, p: AppDetail["permissions"]): SafeHtml {
  const outstanding = i.state === "requested";
  const iconBox =
    i.status === "overdue"
      ? html`<div class="w-6 h-6 rounded bg-error-container flex items-center justify-center text-on-error-container mt-0.5">${icon("priority_high")}</div>`
      : i.status === "due_today"
        ? html`<div class="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center text-tertiary mt-0.5">${icon("alarm")}</div>`
        : i.status === "on_track"
          ? html`<div class="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center text-tertiary mt-0.5">${icon("pending")}</div>`
          : i.status === "waived"
            ? html`<div class="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-on-surface-variant mt-0.5">${icon("do_not_disturb_on")}</div>`
            : html`<div class="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-primary-container mt-0.5">${icon("check_circle")}</div>`;
  let meta: SafeHtml;
  if (i.status === "received") {
    meta = html`Req: ${dayMonth(i.requested_on)} · Round ${i.round} · Owner: <strong class="text-on-surface">${i.owner}</strong> · Received ${i.received_at ? timestamp(i.received_at) : ""} · Confirmed by <strong class="text-on-surface">${i.received_by ?? ""}</strong>`;
  } else if (i.status === "waived") {
    meta = html`Waived by <strong class="text-on-surface font-medium">${i.waived_by ?? ""}</strong> · <span class="italic text-on-surface-variant">Reason: ${i.waived_reason ?? ""}</span>`;
  } else {
    const due =
      i.status === "overdue"
        ? html`<span class="text-error font-bold font-tabular-data">Due ${dayMonth(i.due_date)} · ${i.days_past_due} days overdue</span>`
        : i.status === "due_today"
          ? html`<span class="text-tertiary-container font-semibold">Due: ${relativeDay(i.due_date)} (${dayMonth(i.due_date)})</span>`
          : html`<span class="text-on-surface-variant">Due: ${dayMonth(i.due_date)}</span>`;
    meta = html`Req: ${dayMonth(i.requested_on)} · Round ${i.round} · Owner: <strong class="text-on-surface">${i.owner}</strong> · ${due}`;
  }
  const rowBg = i.status === "overdue" ? "bg-error-container/15 hover:bg-error-container/25" : "hover:bg-surface-container-low/40";
  return html`<div class="p-space-md ${rowBg} transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-space-sm ${i.status === "waived" ? "opacity-90" : ""}">
<div class="flex items-start gap-space-sm min-w-0">${iconBox}
<div class="flex flex-col min-w-0">
<div class="flex items-center gap-space-xs flex-wrap">
<span class="font-label-default text-label-default ${i.status === "overdue" ? "text-error font-bold" : i.status === "waived" ? "text-on-surface-variant font-medium line-through" : "text-on-surface font-semibold"}">${i.name}</span>
${i.analyst_request_id && outstanding ? html`<span class="px-space-xs rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-compact text-label-compact font-bold">Analyst request</span>` : ""}
</div>
<span class="font-body-compact text-body-compact text-on-surface-variant">${meta}</span>
</div></div>
<div class="flex items-center gap-space-xs self-end md:self-center shrink-0">
<span class="px-space-sm py-0.5 rounded-full ${ITEM_CHIP[i.status]} font-label-compact text-label-compact font-bold uppercase tracking-wider flex items-center gap-1">${i.status === "received" ? icon("verified", "text-[13px]") : ""}${i.status_label}</span>
${outstanding && p.draft_reminder ? html`<button type="button" data-action="draft" data-item="${i.id}" class="px-space-sm py-1 rounded bg-primary-container text-on-primary hover:bg-primary font-label-compact text-label-compact font-medium flex items-center gap-1 transition-colors">${icon("edit_note", "text-[14px]")} Create Reminder Draft</button>` : ""}
${outstanding && p.mark_received ? html`<button type="button" data-action="receive" data-item="${i.id}" class="px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-compact text-label-compact flex items-center gap-1 transition-colors">${icon("inventory", "text-[14px]")} Mark Received</button>` : ""}
${outstanding && p.waive ? html`<button type="button" data-action="waive" data-item="${i.id}" class="px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-compact text-label-compact transition-colors">Waive Item</button>` : ""}
</div></div>`;
}

function blockerPanel(d: AppDetail): SafeHtml {
  if (!d.blocking.length) {
    return html`<section class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm relative overflow-hidden">
<div class="absolute top-0 left-0 bottom-0 w-1.5 bg-primary" aria-hidden="true"></div>
<div class="pl-space-xs flex flex-col gap-space-sm"><div class="flex items-center gap-space-xs text-primary">${icon("task_alt", "text-[20px]")}<h2 class="font-headline-sm text-headline-sm font-bold tracking-tight">File complete</h2></div>
<p class="font-body-compact text-body-compact text-on-surface">Every checklist item is received or waived. ${d.analyst ? html`The file is ready for <strong>${d.analyst.name}</strong>.` : "The file is ready for credit analysis."}</p></div></section>`;
  }
  const overdue = d.blocking.filter((i) => i.status === "overdue");
  return html`<section class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm relative overflow-hidden" aria-labelledby="blocker-title">
<div class="absolute top-0 left-0 bottom-0 w-1.5 ${overdue.length ? "bg-error" : "bg-tertiary"}" aria-hidden="true"></div>
<div class="pl-space-xs flex flex-col gap-space-sm">
<div class="flex items-center justify-between">
<div class="flex items-center gap-space-xs ${overdue.length ? "text-error" : "text-tertiary"}">${icon("block", "text-[20px]")}<h2 id="blocker-title" class="font-headline-sm text-headline-sm font-bold tracking-tight">What is blocking this file</h2></div>
<span class="px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-label-compact text-label-compact font-bold uppercase">${d.blocking.length} outstanding</span>
</div>
<p class="font-body-compact text-body-compact text-on-surface">${d.analyst ? html`Credit analysis by <strong>${d.analyst.name}</strong> is waiting on these client documents:` : "The file cannot go to credit analysis until these client documents arrive:"}</p>
<div class="bg-surface-container-low rounded p-space-sm flex flex-col gap-space-xs text-on-surface font-body-compact text-body-compact">
${d.blocking.map(
  (i) => html`<div class="flex items-start gap-space-xs">${icon("arrow_right", `${i.status === "overdue" ? "text-error" : "text-tertiary"} text-[16px] mt-0.5`)}<div><strong class="text-on-surface font-semibold">${i.name}</strong>
<p class="text-on-surface-variant font-body-compact text-body-compact">Owner: ${i.owner} · ${i.status === "overdue" ? `${i.days_past_due} days overdue` : i.status === "due_today" ? "due today" : `due ${dayMonth(i.due_date)}`} · requested ${i.age_days} days ago</p></div></div>`,
)}
</div>
${d.analyst_requests.length
  ? html`<div class="flex flex-col gap-space-xs">${d.analyst_requests.map(
      (r) => html`<div class="p-space-sm rounded bg-tertiary-fixed/60 text-on-tertiary-fixed font-body-compact text-body-compact"><strong>Analyst request from ${r.analyst}</strong> (${timestamp(r.created_at)}): ${r.note}</div>`,
    )}</div>`
  : ""}
</div></section>`;
}

const DOT_BY_EVENT: Record<string, string> = {
  reminder_drafted: "bg-primary",
  document_received: "bg-primary-container",
  file_marked_complete: "bg-primary",
};

function timelinePanel(events: TimelineEvent[]): SafeHtml {
  const shown = 6;
  return html`<section class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col" aria-labelledby="tl-title">
<div class="flex items-center justify-between pb-space-sm border-b border-surface-container">
<div class="flex items-center gap-space-xs">${icon("history", "text-primary text-[18px]")}<h2 id="tl-title" class="font-headline-sm text-headline-sm text-on-surface">Activity &amp; Audit Log</h2></div>
<span class="font-label-compact text-label-compact text-on-surface-variant">Immutable Trail</span>
</div>
<ol class="relative pl-6 pt-space-md flex flex-col gap-space-md">
<div class="absolute top-space-md bottom-2 left-2.5 w-0.5 bg-surface-container" aria-hidden="true"></div>
${events.map(
  (e, n) => html`<li class="relative flex flex-col gap-0.5 ${n >= shown ? "hidden" : ""}" ${n >= shown ? "data-extra-event" : ""}>
<div class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ${DOT_BY_EVENT[e.event_type] ?? "bg-surface-container-highest"} ring-4 ring-surface-container-lowest" aria-hidden="true"></div>
<div class="flex items-center justify-between gap-space-xs">
<span class="font-label-compact text-label-compact ${n === 0 ? "text-primary font-bold" : "text-on-surface-variant font-medium"}">${timestamp(e.occurred_at)}</span>
<span class="px-space-xs rounded bg-surface-container text-on-surface font-label-compact text-label-compact">${e.event_label}</span>
</div>
<span class="font-body-compact text-body-compact text-on-surface">${e.reason}</span>
<span class="font-label-compact text-label-compact text-on-surface-variant">${e.actor_name} · ${e.actor_role_label}</span>
</li>`,
)}
</ol>
${events.length > shown
  ? html`<button type="button" id="history-toggle" class="mt-space-md pt-space-xs border-t border-surface-container w-full text-center text-primary hover:text-primary-container font-label-compact text-label-compact font-medium transition-colors">View Full Audit History (${events.length - shown} more entries) →</button>`
  : ""}
</section>`;
}
