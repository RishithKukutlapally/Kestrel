/** Screen A: Application queue. Markup from Design/application_queue_1/code.html.
 *  Changes: phone numbers and "₹ Volume" removed; stage "Incomplete Review" replaced by derived
 *  stages; row checkboxes, "Bulk Review" and "+ New Request Pack" removed (no flow in the spec;
 *  applications come from the LOS); summary strip and pagination computed from real data. */

import { api, type AppSummary, type QueueResponse } from "../api";
import { dayMonthYear, pad2, plural, relativeDay, time12 } from "../format";
import { html, icon, raw, type SafeHtml } from "../html";
import { link, type Route } from "../router";
import { DOT, FILE_CHIP, oldestFlag, STAGE_CHIP } from "../status";
import type { Ctx } from "../main";

const PAGE_SIZE = 10;

export async function renderQueue(ctx: Ctx, route: Route): Promise<void> {
  const p = route.params;
  const qs = new URLSearchParams();
  for (const k of ["rm", "stage", "status", "q", "sort"]) if (p.get(k)) qs.set(k, p.get(k)!);
  const data = await api.get<QueueResponse>(`/api/queue?${qs.toString()}`);
  const page = Math.max(1, Number(p.get("page") ?? "1"));
  ctx.root.innerHTML = view(data, p, page, ctx.session.user.role === "rm").value;
  wire(ctx, p, data);
}

function setParam(p: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(p);
  if (value) next.set(key, value);
  else next.delete(key);
  next.delete("page");
  return link("queue", undefined, Object.fromEntries(next));
}

function wire(ctx: Ctx, p: URLSearchParams, data: QueueResponse): void {
  const root = ctx.root;
  for (const sel of root.querySelectorAll<HTMLSelectElement>("select[data-param]")) {
    sel.addEventListener("change", () => ctx.go(setParam(p, sel.dataset.param!, sel.value)));
  }
  const search = root.querySelector<HTMLInputElement>("#queue-search")!;
  let t: number | undefined;
  search.addEventListener("input", () => {
    window.clearTimeout(t);
    t = window.setTimeout(() => ctx.go(setParam(p, "q", search.value.trim())), 350);
  });
  root.querySelector("#reset-filters")!.addEventListener("click", () => ctx.go(link("queue")));
  root.querySelector("#quick-filter-overdue")?.addEventListener("click", () => ctx.go(setParam(p, "status", "overdue")));
  root.querySelector("#dismiss-guide")?.addEventListener("click", (e) => {
    (e.currentTarget as HTMLElement).closest("[data-guide]")?.remove();
  });
  root.querySelector("#export-csv")!.addEventListener("click", () => exportCsv(data.rows));
  // Whole-row click mirrors the row's primary link; the link itself is the keyboard target.
  for (const tr of root.querySelectorAll<HTMLTableRowElement>("tr[data-href]")) {
    tr.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("a,button,input,select")) return;
      ctx.go(tr.dataset.href!);
    });
  }
}

function exportCsv(rows: AppSummary[]): void {
  const head = ["Application", "Client", "RM", "Age (days)", "Stage", "Outstanding", "Oldest outstanding item", "Status"];
  const lines = rows.map((r) =>
    [r.id, r.client_name, r.rm.name, r.age_days, r.stage_label, r.outstanding_count, r.oldest_outstanding?.name ?? "", r.status_label]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "kestrel-queue.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function view(d: QueueResponse, p: URLSearchParams, page: number, isRm: boolean): SafeHtml {
  const s = d.summary;
  const pages = Math.max(1, Math.ceil(d.rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = d.rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const maxBar = Math.max(1, ...s.receipts_last_5_days);
  const deltaDown = (s.median_wait_delta ?? 0) <= 0;
  return html`<div class="flex flex-col w-full space-y-space-md">
<h1 class="sr-only">Application queue</h1>
<!-- Top Metrics Strip (server-computed) -->
<section aria-label="Queue summary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
<div class="flex items-start justify-between"><div class="space-y-0.5">
<span class="font-label-default text-label-default text-on-surface-variant uppercase tracking-wider">Applications Open</span>
<div class="flex items-baseline gap-space-xs mt-1"><span class="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">${pad2(s.open)}</span><span class="font-label-compact text-label-compact text-on-surface-variant font-medium">active files</span></div>
</div><div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">${icon("folder_open", "text-[20px]")}</div></div>
<div class="mt-space-md pt-space-xs flex items-center justify-between text-on-surface-variant">
<span class="font-body-compact text-body-compact flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-primary-container" aria-hidden="true"></span>Across ${plural(s.rm_count, "RM")}</span>
<span class="font-label-compact text-label-compact text-on-surface-variant">${s.complete} complete</span>
</div></div>

<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
<div class="flex items-start justify-between"><div class="space-y-0.5">
<div class="flex items-center gap-1.5"><span class="font-label-default text-label-default text-on-surface-variant uppercase tracking-wider">Applications Overdue</span>
${s.overdue ? html`<span class="px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-compact text-label-compact font-bold uppercase tracking-wider">Chasing required</span>` : ""}</div>
<div class="flex items-baseline gap-space-xs mt-1"><span class="font-headline-lg text-headline-lg text-error font-bold tracking-tight">${pad2(s.overdue)}</span><span class="font-label-compact text-label-compact text-on-surface-variant font-medium">requiring RM action</span></div>
</div><div class="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center text-error">${icon("warning", "text-[20px]")}</div></div>
<div class="mt-space-md pt-space-xs flex items-center justify-between">
<button type="button" class="font-label-compact text-label-compact text-error font-semibold flex items-center gap-1 hover:underline rounded" id="quick-filter-overdue">Filter ${s.overdue} overdue ${s.overdue === 1 ? "case" : "cases"} ${icon("arrow_forward", "text-[14px]")}</button>
<span class="font-label-compact text-label-compact text-on-surface-variant font-mono">${s.overdue_share_pct}% of open</span>
</div></div>

<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
<div class="flex items-start justify-between"><div class="space-y-0.5">
<span class="font-label-default text-label-default text-on-surface-variant uppercase tracking-wider">Median Waiting Time</span>
<div class="flex items-baseline gap-space-xs mt-1"><span class="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">${s.median_wait_days ?? "–"}</span><span class="font-label-compact text-label-compact text-on-surface-variant font-medium">days to submission (7d)</span></div>
</div>
<div class="w-16 h-8 flex items-end gap-1" role="img" aria-label="Documents received per day, last 5 days: ${s.receipts_last_5_days.join(", ")}">
${s.receipts_last_5_days.map((n, i) => html`<div class="w-2.5 rounded-t-sm ${i === 4 ? "bg-primary-container" : "bg-surface-container-highest"}" style="height:${Math.max(3, Math.round((n / maxBar) * 32))}px"></div>`)}
</div></div>
<div class="mt-space-md pt-space-xs flex items-center justify-between text-on-surface-variant">
${s.median_wait_delta === null
  ? html`<span class="font-body-compact text-body-compact">Not enough receipts last week</span>`
  : html`<span class="font-body-compact text-body-compact flex items-center gap-1 text-on-primary-fixed-variant font-semibold">${icon(deltaDown ? "trending_down" : "trending_up", "text-[14px]")}${s.median_wait_delta > 0 ? "+" : ""}${s.median_wait_delta} days vs last week</span>`}
<span class="font-label-compact text-label-compact text-on-surface-variant">From event log</span>
</div></div>

<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
<div class="flex items-start justify-between"><div class="space-y-0.5">
<span class="font-label-default text-label-default text-on-surface-variant uppercase tracking-wider">Draft Reminders</span>
<div class="flex items-baseline gap-space-xs mt-1"><span class="font-headline-lg text-headline-lg text-primary-container font-bold tracking-tight">${pad2(s.drafts_pending)}</span><span class="font-label-compact text-label-compact text-on-surface-variant font-medium">queued for RM sign-off</span></div>
</div><div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">${icon("mark_email_unread", "text-[20px]")}</div></div>
<div class="mt-space-md pt-space-xs flex items-center justify-between">
<span class="font-body-compact text-body-compact text-on-surface-variant flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-tertiary-container" aria-hidden="true"></span>Requires RM signature</span>
${s.analyst_requests_open ? html`<span class="font-label-compact text-label-compact text-tertiary font-semibold">${plural(s.analyst_requests_open, "analyst request")}</span>` : ""}
</div></div>
</section>

${isRm ? html`<div data-guide class="bg-surface-container-low p-space-sm rounded-lg shadow-sm flex items-center justify-between">
<div class="flex items-center gap-space-sm"><div class="w-6 h-6 rounded bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0">${icon("info")}</div>
<p class="font-body-compact text-body-compact text-on-surface"><span class="font-semibold text-primary">First-Time RM Guide:</span> Client document follow-ups require your explicit review and sign-off. Click <span class="font-semibold text-on-surface bg-surface-container-highest/60 px-1 py-0.5 rounded">Review Draft</span> on any application to inspect pending requests before anything is dispatched.</p></div>
<div class="flex items-center gap-space-xs flex-shrink-0 pl-space-md"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase tracking-wider">Zero Auto-Dispatch Protocol</span>
<button type="button" id="dismiss-guide" class="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container" aria-label="Dismiss guide">${icon("close")}</button></div>
</div>` : ""}

<!-- Operational Control Bar -->
<div class="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
<div class="flex flex-wrap items-center gap-space-xs flex-1">
<div class="relative flex items-center min-w-[240px] flex-1 lg:max-w-xs">
<span class="material-symbols-outlined absolute left-2.5 text-outline text-[16px]" aria-hidden="true">search</span>
<label class="sr-only" for="queue-search">Filter by client or application ID</label>
<input class="h-8 pl-8 pr-3 w-full rounded bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-compact text-body-compact focus:bg-surface-container focus:ring-1 focus:ring-primary-container" id="queue-search" placeholder="Filter client, ID (KF-2026-XXXX)..." type="search" value="${p.get("q") ?? ""}"/>
</div>
${d.filters.rms.length > 1 ? selectBox("rm", "Filter by RM", p.get("rm") ?? "", [["", `All RMs (${d.filters.rms.map((r) => r.name.split(" ")[0]).join(", ")})`], ...d.filters.rms.map((r) => [r.id, `${r.name} (${plural(r.open, "open file")})`] as [string, string])]) : ""}
${selectBox("stage", "Filter by stage", p.get("stage") ?? "", [["", "All Stages"], ...d.filters.stages.map((s2) => [s2.id, `${s2.label} (${s2.count})`] as [string, string])])}
${selectBox("status", "Filter by status", p.get("status") ?? "", [["", "All Statuses"], ["overdue", "Overdue"], ["due_today", "Due today"], ["on_track", "On track"], ["complete", "Complete"]])}
${selectBox("sort", "Sort", p.get("sort") ?? "oldest", [["oldest", "Sort: Oldest Outstanding Item First"], ["newest", "Sort: Recently Opened"], ["overdue_first", "Sort: Overdue Items Priority"], ["docs_desc", "Sort: Highest Outstanding Docs"]])}
<button type="button" class="h-8 px-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-[12px] font-medium flex items-center gap-1 transition-colors" id="reset-filters">${icon("filter_alt_off", "text-[14px]")} Clear</button>
</div>
<div class="flex items-center gap-space-xs flex-shrink-0">
<button type="button" id="export-csv" class="h-8 px-3 rounded bg-surface-container-high text-on-surface hover:bg-surface-variant font-label-default text-label-default flex items-center gap-1.5 transition-colors">${icon("file_download")} Export CSV</button>
</div>
</div>

<!-- Master Data Table -->
<div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
<div class="overflow-x-auto w-full">
<table class="w-full text-left text-on-surface table-fixed" style="min-width: 1200px;">
<caption class="sr-only">Applications sorted by ${p.get("sort") === "newest" ? "most recently opened" : "oldest outstanding item"}. ${d.rows.length} rows.</caption>
<colgroup><col style="width: 230px;"/><col style="width: 115px;"/><col style="width: 120px;"/><col style="width: 70px;"/><col style="width: 130px;"/><col style="width: 75px;"/><col style="width: 270px;"/><col style="width: 140px;"/><col style="width: 100px;"/><col style="width: 140px;"/></colgroup>
<thead class="bg-surface-container-low text-on-surface-variant font-label-default text-label-default uppercase tracking-wider select-none">
<tr class="h-9">
<th scope="col" class="pl-3 px-2 py-1 font-semibold">Client &amp; City</th>
<th scope="col" class="px-2 py-1 font-semibold">App ID</th>
<th scope="col" class="px-2 py-1 font-semibold">Assigned RM</th>
<th scope="col" class="px-2 py-1 font-semibold text-right">Age</th>
<th scope="col" class="px-2 py-1 font-semibold">Stage</th>
<th scope="col" class="px-2 py-1 font-semibold text-center">Docs</th>
<th scope="col" class="px-2 py-1 font-semibold">Oldest Outstanding Item</th>
<th scope="col" class="px-2 py-1 font-semibold">Next Follow-up</th>
<th scope="col" class="px-2 py-1 font-semibold text-center">Status</th>
<th scope="col" class="pr-3 pl-2 py-1 text-right font-semibold">Action</th>
</tr></thead>
<tbody class="font-body-compact text-body-compact divide-y divide-surface-container">
${rows.length ? rows.map(row) : html`<tr><td colspan="10" class="p-space-lg text-center text-on-surface-variant">No applications match these filters.</td></tr>`}
</tbody></table></div>
<div class="px-space-md py-space-sm bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-sm">
<div class="text-on-surface-variant font-body-compact text-body-compact"><span>Showing <strong class="text-on-surface font-semibold">${d.rows.length ? (cur - 1) * PAGE_SIZE + 1 : 0}–${Math.min(cur * PAGE_SIZE, d.rows.length)}</strong> of <strong class="text-on-surface font-semibold">${d.rows.length}</strong> applications</span></div>
<div class="flex items-center gap-space-xs text-on-surface-variant font-label-compact text-label-compact bg-surface-container-lowest/80 px-2.5 py-1 rounded">${icon("verified", "text-[14px]")}<span>Operational Note: No credit scores or evaluations displayed; document workflow only.</span></div>
<nav aria-label="Pagination" class="flex items-center gap-1">
${pageLink(p, cur - 1, cur <= 1, html`${icon("chevron_left")}<span class="sr-only">Previous page</span>`)}
${Array.from({ length: pages }, (_, i) => i + 1).map((n) => n === cur
  ? html`<span aria-current="page" class="w-7 h-7 rounded bg-primary text-on-primary font-mono text-[12px] font-semibold flex items-center justify-center">${n}</span>`
  : html`<a href="${pageHref(p, n)}" class="w-7 h-7 rounded text-on-surface-variant hover:bg-surface-container font-mono text-[12px] flex items-center justify-center">${n}</a>`)}
${pageLink(p, cur + 1, cur >= pages, html`${icon("chevron_right")}<span class="sr-only">Next page</span>`)}
</nav>
</div></div></div>`;
}

function pageHref(p: URLSearchParams, n: number): string {
  const next = new URLSearchParams(p);
  next.set("page", String(n));
  return link("queue", undefined, Object.fromEntries(next));
}

function pageLink(p: URLSearchParams, n: number, disabled: boolean, label: SafeHtml): SafeHtml {
  return disabled
    ? html`<span class="w-7 h-7 rounded flex items-center justify-center text-outline-variant opacity-50" aria-hidden="true">${label}</span>`
    : html`<a href="${pageHref(p, n)}" class="w-7 h-7 rounded flex items-center justify-center text-on-surface hover:bg-surface-container">${label}</a>`;
}

function selectBox(param: string, label: string, value: string, options: [string, string][]): SafeHtml {
  return html`<div class="relative">
<label class="sr-only" for="f-${param}">${label}</label>
<select id="f-${param}" data-param="${param}" class="h-8 pl-2 pr-7 rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact focus:bg-surface-container cursor-pointer appearance-none">
${options.map(([v, t]) => html`<option value="${v}" ${v === value ? raw("selected") : ""}>${t}</option>`)}
</select>
<span class="material-symbols-outlined absolute right-1.5 top-2 pointer-events-none text-outline text-[16px]" aria-hidden="true">expand_more</span>
</div>`;
}

function followUp(r: AppSummary): SafeHtml {
  const f = r.next_follow_up;
  if (!f.at) return html`<span class="text-on-surface-variant">—</span>`;
  if (f.kind === "scheduled_reminder") {
    return html`<span class="text-on-surface-variant" title="Approved reminder scheduled">${relativeDay(f.at)}, ${time12(f.at)} ${icon("schedule_send", "text-[12px] align-middle")}</span>`;
  }
  const label = relativeDay(f.at);
  if (r.status === "overdue") return html`<span class="text-error font-medium">${label === "Yesterday" ? "Yesterday" : dayMonthYear(f.at)} (missed)</span>`;
  if (r.status === "due_today") return html`<span class="text-tertiary font-semibold">${label}</span>`;
  return html`<span class="text-on-surface-variant">${label}</span>`;
}

function row(r: AppSummary): SafeHtml {
  const o = r.oldest_outstanding;
  const hot = r.status === "overdue";
  const flag = o ? oldestFlag(o.status, o.days_past_due) : null;
  const checklist = link("checklist", r.id);
  const action = r.draft
    ? html`<a class="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded bg-primary-container text-on-primary font-label-compact text-label-compact font-semibold hover:bg-primary transition-all" href="${link("composer", r.id)}">Review Draft (${r.draft.items})</a>`
    : html`<a class="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-label-compact text-label-compact font-medium transition-colors" href="${checklist}">Open Checklist</a>`;
  return html`<tr data-href="${checklist}" class="h-11 hover:bg-surface-container-low/70 transition-colors group ${hot ? "bg-error-container/10" : ""}">
<td class="pl-3 px-2 py-1 truncate"><div class="flex flex-col">
<span class="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">${r.client_name}</span>
<span class="font-label-compact text-label-compact text-on-surface-variant flex items-center gap-1">${icon("location_on", "text-[12px]")} ${r.city} · ${r.product}${r.open_analyst_requests ? html` · <span class="text-tertiary font-semibold">Analyst request</span>` : ""}</span>
</div></td>
<td class="px-2 py-1 font-mono font-tabular-data text-tabular-data font-semibold"><a class="text-primary hover:underline rounded" href="${checklist}">${r.id}</a></td>
<td class="px-2 py-1 truncate text-on-surface-variant font-medium">${r.rm.name}</td>
<td class="px-2 py-1 text-right font-mono font-tabular-data text-tabular-data ${hot ? "text-error" : "text-on-surface-variant"} font-semibold">${r.age_days}d</td>
<td class="px-2 py-1"><span class="px-2 py-0.5 rounded text-[11px] font-semibold ${STAGE_CHIP[r.stage]}">${r.stage_label}</span></td>
<td class="px-2 py-1 text-center font-mono font-tabular-data text-tabular-data font-bold text-on-surface">${r.outstanding_count ? plural(r.outstanding_count, "doc") : "—"}</td>
<td class="px-2 py-1">${o
    ? html`<div class="flex items-center gap-1.5 truncate">
<span class="w-1.5 h-1.5 rounded-full ${DOT[o.status]} flex-shrink-0" aria-hidden="true"></span>
<span class="truncate text-on-surface font-medium" title="${o.name}">${o.name}</span>
${flag ? html`<span class="px-1.5 rounded ${flag.cls} text-[10px] font-bold uppercase flex-shrink-0">${flag.text}</span>` : html`<span class="text-on-surface-variant text-[11px] flex-shrink-0">· ${plural(o.age_days, "day")}</span>`}
</div>`
    : html`<span class="text-on-surface-variant">All items received or waived</span>`}</td>
<td class="px-2 py-1 font-mono text-[11px]">${followUp(r)}</td>
<td class="px-2 py-1 text-center"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${FILE_CHIP[r.status]}">${r.status_label}</span></td>
<td class="pr-3 pl-2 py-1 text-right">${action}</td>
</tr>`;
}
