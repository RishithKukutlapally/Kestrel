/** Screen D: Analyst file view. Markup from Design/analyst_file_view_1/code.html.
 *  Changes: DSCR/solvency language, "Verification score", "Bottleneck stages", account numbers,
 *  GSTIN, CIN, parsing/extraction claims and "Mark Provisional Assessment Started" removed
 *  (credit analysis and slice-two extraction are out of scope). Shows Complete or Blocked,
 *  the blocking items, received items and a "Request from RM" form that creates a linked request. */

import { api, ApiError, type AnalystDetail, type AppSummary } from "../api";
import { dayMonth, timestamp } from "../format";
import { html, icon, raw, type SafeHtml } from "../html";
import { link, type Route } from "../router";
import type { Ctx } from "../main";

export async function renderAnalyst(ctx: Ctx, route: Route): Promise<void> {
  const files = await api.get<AppSummary[]>("/api/analyst/files");
  const id = route.id ?? files[0]?.id;
  if (!id) {
    ctx.root.innerHTML = html`<p class="p-space-lg">No files are assigned to you.</p>`.value;
    return;
  }
  if (!route.id) {
    window.location.replace(link("analyst", id));
    return;
  }
  const d = await api.get<AnalystDetail>(`/api/analyst/files/${encodeURIComponent(id)}`);
  ctx.root.innerHTML = view(d, files, ctx.session.user.name).value;
  const form = ctx.root.querySelector<HTMLFormElement>("#req-form");
  ctx.root.querySelectorAll<HTMLButtonElement>("[data-select]").forEach((b) =>
    b.addEventListener("click", () => {
      const cb = ctx.root.querySelector<HTMLInputElement>(`input[name="item"][value="${b.dataset.select}"]`);
      if (cb) cb.checked = true;
      ctx.root.querySelector<HTMLTextAreaElement>("#rm-note-input")?.focus();
    }),
  );
  ctx.root.querySelector("#btn-request-rm")?.addEventListener("click", () => ctx.root.querySelector<HTMLTextAreaElement>("#rm-note-input")?.focus());
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ids = [...form.querySelectorAll<HTMLInputElement>('input[name="item"]:checked')].map((x) => Number(x.value));
    const note = (form.querySelector("#rm-note-input") as HTMLTextAreaElement).value.trim();
    const fb = ctx.root.querySelector("#requisition-feedback")!;
    if (!ids.length || !note) {
      fb.textContent = "Select at least one blocking document and add a note.";
      fb.classList.remove("hidden");
      return;
    }
    try {
      const r = await api.post<{ rm: string }>(`/api/analyst/files/${d.id}/request-from-rm`, { item_ids: ids, note });
      ctx.toast(`Request logged and added to ${r.rm}'s queue`);
      await renderAnalyst(ctx, route);
    } catch (err) {
      fb.textContent = err instanceof ApiError ? err.message : "Could not send the request";
      fb.classList.remove("hidden");
    }
  });
  ctx.root.querySelector<HTMLSelectElement>("#file-picker")?.addEventListener("change", (e) => ctx.go(link("analyst", (e.target as HTMLSelectElement).value)));
}

function view(d: AnalystDetail, files: AppSummary[], me: string): SafeHtml {
  const blocked = d.readiness === "blocked";
  const other = files.find((f) => f.id !== d.id && f.status === "complete");
  return html`<div class="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div class="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm bg-surface-container-low px-space-md py-space-xs rounded-lg">
<div class="flex items-center gap-space-sm font-label-compact text-label-compact text-on-surface-variant flex-wrap">
<span class="font-semibold text-primary">CREDIT ANALYSIS DESK</span><span class="text-outline-variant" aria-hidden="true">/</span>
<span>Analyst: <strong class="text-on-surface">${me}</strong></span><span class="text-outline-variant" aria-hidden="true">/</span>
<label for="file-picker" class="sr-only">Switch file</label>
<select id="file-picker" class="h-7 px-space-xs rounded bg-surface-container-lowest text-on-surface font-label-compact text-label-compact">
${files.map((f) => html`<option value="${f.id}" ${f.id === d.id ? raw("selected") : ""}>${f.id} · ${f.status === "complete" ? "Complete" : "Blocked"}</option>`)}
</select></div>
${other ? html`<div class="flex items-center gap-space-xs text-on-surface-variant font-label-compact text-label-compact"><span class="w-2 h-2 rounded-full bg-secondary" aria-hidden="true"></span><span><a class="text-on-surface font-semibold hover:underline" href="${link("analyst", other.id)}">${other.id}</a> is complete and ready for analysis</span></div>` : ""}
</div>
<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
<div class="flex flex-col gap-space-xs">
<div class="flex flex-wrap items-center gap-space-sm">
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">File ${d.id}: ${d.client_name}</h1>
${blocked
  ? html`<span class="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-error-container text-on-error-container font-label-default text-label-default">${icon("error", "text-[16px] text-error")}STATUS: BLOCKED (${d.outstanding_count} Outstanding ${d.outstanding_count === 1 ? "Document" : "Documents"})</span>`
  : html`<span class="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-fixed font-label-default text-label-default">${icon("task_alt", "text-[16px] text-primary")}STATUS: COMPLETE · Ready for analysis</span>`}
</div>
<p class="font-body-compact text-body-compact text-on-surface-variant flex items-center gap-space-xs">${blocked
    ? html`${icon("block", "text-error text-[16px]")}<span><strong class="text-on-surface">On hold:</strong> the items below must be received or waived before this file is complete.</span>`
    : html`${icon("verified", "text-primary text-[16px]")}<span>Every checklist item is received or waived. No action needed from the RM.</span>`}</p>
</div>
<div class="flex items-center flex-wrap gap-space-sm">
<a class="h-8 px-space-md rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-default text-label-default flex items-center gap-1.5 transition-colors" href="${link("checklist", d.id)}">${icon("checklist")}<span>Jump to Application Checklist</span></a>
${blocked ? html`<button type="button" id="btn-request-rm" class="h-8 px-space-md rounded bg-primary-container text-on-primary font-label-default text-label-default flex items-center gap-1.5 hover:bg-primary transition-colors shadow-sm">${icon("assignment_turned_in")}<span>Request from RM</span></button>` : ""}
</div></div>
<div class="grid grid-cols-2 md:grid-cols-4 gap-space-sm pt-space-xs">
${kv("APPLICANT TYPE", d.applicant_type)}
${kv("ASSIGNED RM", d.rm.name)}
${kv("DOCUMENTS", `${d.items_done} / ${d.items_total} received or waived`)}
${kv("OPENED", `${dayMonth(d.opened_on)} (${d.age_days} days)`)}
</div></div>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter mt-space-md">
<div class="lg:col-span-7 flex flex-col gap-space-md">
${blocked
  ? html`<div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
<div class="bg-error-container/30 px-space-lg py-space-sm flex items-center justify-between">
<div class="flex items-center gap-space-xs">${icon("report_problem", "text-error text-[18px]")}<h2 class="font-headline-sm text-headline-sm text-on-surface">Blocking Items (${d.blocking.length})</h2></div>
<span class="px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-label-compact text-label-compact">FILE NOT COMPLETE</span>
</div>
<div class="p-space-lg flex flex-col gap-space-md">
<p class="font-body-compact text-body-compact text-on-surface-variant">These documents have not been received. The client is contacted only by the RM, after RM approval.</p>
${d.blocking.map(
  (i) => html`<div class="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
<div class="flex items-start justify-between gap-space-sm">
<div class="flex items-center gap-space-sm">
<div class="w-7 h-7 rounded ${i.status === "overdue" ? "bg-error/10 text-error" : "bg-secondary-container text-on-secondary-fixed"} flex items-center justify-center shrink-0">${icon(i.status === "overdue" ? "close" : "hourglass_top", "text-[18px]")}</div>
<div><h3 class="font-label-default text-label-default text-on-surface font-semibold">${i.name}</h3>
<div class="flex flex-wrap items-center gap-space-xs text-on-surface-variant font-label-compact text-label-compact">
<span>${i.category}</span><span aria-hidden="true">•</span><span>Owner: <strong class="text-on-surface">${i.owner}</strong></span><span aria-hidden="true">•</span>
<span class="${i.status === "overdue" ? "text-error" : "text-tertiary"} font-medium">Requested ${dayMonth(i.requested_on)} · ${i.status === "overdue" ? `${i.days_past_due}d overdue` : i.status === "due_today" ? "due today" : `due ${dayMonth(i.due_date)}`}</span>
${i.analyst_request_id ? html`<span class="px-space-xs rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-bold">Already requested from RM</span>` : ""}
</div></div></div>
<button type="button" data-select="${i.id}" class="h-7 px-space-sm rounded bg-surface-container-highest hover:bg-primary-container hover:text-on-primary text-on-surface font-label-compact text-label-compact flex items-center gap-1 transition-colors shrink-0">${icon("forward", "text-[14px]")}<span>Select for Request</span></button>
</div></div>`,
)}
</div></div>`
  : ""}
<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
<div class="flex items-center justify-between">
<div class="flex items-center gap-space-xs">${icon("check_circle", "text-primary text-[20px]")}<h2 class="font-headline-sm text-headline-sm text-on-surface">Received &amp; Waived Documents (${d.received_items.length})</h2></div>
</div>
<div class="flex flex-col gap-space-sm">
${d.received_items.map(
  (i) => html`<div class="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-space-md">
<div class="flex items-center gap-space-sm min-w-0">${icon(i.status === "waived" ? "do_not_disturb_on" : "verified", `${i.status === "waived" ? "text-on-surface-variant" : "text-primary"} text-[18px]`)}
<div class="min-w-0"><p class="font-label-default text-label-default text-on-surface font-semibold truncate">${i.name}</p>
<p class="font-label-compact text-label-compact text-on-surface-variant truncate">${i.status === "waived" ? `Waived by ${i.waived_by}: ${i.waived_reason}` : `Received ${i.received_at ? timestamp(i.received_at) : ""} · confirmed by ${i.received_by}`}</p></div></div>
<span class="px-space-sm py-0.5 rounded bg-surface-container text-on-surface font-label-compact text-label-compact shrink-0">${i.status_label}</span>
</div>`,
)}
</div></div></div>

<div class="lg:col-span-5 flex flex-col gap-space-md">
${blocked
  ? html`<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
<div class="flex items-center justify-between"><div class="flex items-center gap-space-xs">${icon("outgoing_mail", "text-primary text-[20px]")}<h2 class="font-headline-sm text-headline-sm text-on-surface">Request to Relationship Manager</h2></div>
<span class="px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-compact text-label-compact">Desk-to-Desk Link</span></div>
<p class="font-body-compact text-body-compact text-on-surface-variant">Sends a linked request to <strong>RM ${d.rm.name}</strong>. The client is <em>not</em> contacted automatically; only the RM can approve client reminders.</p>
<form id="req-form" class="flex flex-col gap-space-sm">
<fieldset class="flex flex-col gap-space-xs"><legend class="font-label-compact text-label-compact text-on-surface-variant uppercase tracking-wider mb-1">Blocking documents</legend>
${d.blocking.map((i) => html`<label class="flex items-center gap-space-xs font-body-compact text-body-compact"><input type="checkbox" name="item" value="${i.id}" class="w-4 h-4 accent-primary"/> ${i.name}</label>`)}
</fieldset>
<label for="rm-note-input" class="font-label-compact text-label-compact text-on-surface-variant uppercase tracking-wider mt-1">Note to RM</label>
<textarea class="p-space-sm rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact placeholder:text-on-surface-variant" id="rm-note-input" placeholder="State the specific requirement for the RM..." rows="3" maxlength="1000"></textarea>
<div class="flex items-center justify-between pt-space-xs flex-wrap gap-space-xs">
<span class="font-label-compact text-label-compact text-on-surface-variant">Assignee: ${d.rm.name}</span>
<button type="submit" class="h-8 px-space-md rounded bg-primary text-on-primary font-label-default text-label-default flex items-center gap-1.5 hover:bg-primary-container transition-colors shadow-sm">${icon("send")}<span>Send Request to RM ${d.rm.name}</span></button>
</div>
<p id="requisition-feedback" role="alert" class="hidden p-space-sm rounded bg-error-container text-on-error-container font-label-compact text-label-compact"></p>
</form>
${d.analyst_requests.length ? html`<div class="flex flex-col gap-space-xs">${d.analyst_requests.map((r) => html`<div class="p-space-sm rounded bg-surface-container-low font-body-compact text-body-compact"><strong>Sent ${timestamp(r.created_at)}</strong> by ${r.analyst}: ${r.note}</div>`)}</div>` : ""}
</div>`
  : ""}
<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
<div class="flex items-center justify-between"><div class="flex items-center gap-space-xs">${icon("history_edu", "text-on-surface-variant text-[20px]")}<h2 class="font-headline-sm text-headline-sm text-on-surface">Document Receipt Log</h2></div>
<span class="font-label-compact text-label-compact text-on-surface-variant">Analyst Visibility Only</span></div>
<div class="p-space-xs rounded bg-surface-container text-on-surface-variant font-label-compact text-label-compact">No client-facing reminder text is shown here. Only requests, receipts, waivers and completion, from the event log.</div>
<ol class="relative pl-6 flex flex-col gap-space-md before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-highest">
${d.receipt_log.slice(0, 12).map(
  (e) => html`<li class="relative flex flex-col gap-0.5">
<span class="absolute -left-6 top-0.5 w-3 h-3 rounded-full ${e.event_type === "document_received" || e.event_type === "file_marked_complete" ? "bg-primary" : "bg-outline-variant"} ring-4 ring-surface-container-lowest" aria-hidden="true"></span>
<div class="flex items-center justify-between gap-space-xs"><span class="font-label-default text-label-default text-on-surface font-semibold">${e.event_label}</span><span class="font-tabular-data text-tabular-data text-on-surface-variant">${timestamp(e.occurred_at)}</span></div>
<p class="font-body-compact text-body-compact text-on-surface-variant">${e.reason} · ${e.actor_name}</p>
</li>`,
)}
</ol></div></div></div>`;
}

function kv(k: string, v: string): SafeHtml {
  return html`<div class="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-0.5"><span class="font-label-compact text-label-compact text-on-surface-variant">${k}</span><span class="font-label-default text-label-default text-on-surface">${v}</span></div>`;
}
