/** Agent trace viewer: every check, prompt, model call, validation and cost, in order.
 *  Status is shown as text plus colour (PASS / FAIL / INFO / SKIP). */

import { html, icon, type SafeHtml } from "./html";
import { timestamp } from "./format";

export interface TraceStep {
  step: string;
  status: "pass" | "fail" | "info" | "skip";
  detail: string;
  data: { system?: string; user?: string; output?: string } | null;
}
export interface Trace {
  task_id: string;
  kind: string;
  agent_key: string;
  application_id: string | null;
  triggered_by: string;
  created_at: string;
  status: string;
  total_cost_usd: number;
  total_cost_inr: number;
  steps: TraceStep[];
}

const CHIP: Record<TraceStep["status"], [string, string, string]> = {
  pass: ["PASS", "bg-secondary-container text-on-secondary-fixed", "check_circle"],
  fail: ["FAIL", "bg-error-container text-on-error-container", "cancel"],
  info: ["INFO", "bg-surface-container-high text-on-surface", "info"],
  skip: ["SKIP", "bg-surface-container text-on-surface-variant", "skip_next"],
};

export function traceView(t: Pick<Trace, "steps"> & Partial<Trace>, title = "Agent trace"): SafeHtml {
  return html`<section class="rounded-xl bg-surface-container-lowest p-space-md flex flex-col gap-space-sm" aria-label="${title}">
<div class="flex items-center justify-between flex-wrap gap-space-xs">
<h3 class="font-headline-sm text-headline-sm flex items-center gap-space-xs">${icon("account_tree", "text-primary text-[20px]")}${title}</h3>
<div class="flex items-center gap-space-sm font-label-default text-label-default">
${t.status ? html`<span class="px-space-sm py-0.5 rounded-full font-bold uppercase ${t.status === "ok" ? "bg-secondary-container text-on-secondary-fixed" : t.status === "partial" ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-error-container text-on-error-container"}">${t.status === "ok" ? "Completed" : t.status === "partial" ? "Partial (template kept)" : "Failed"}</span>` : ""}
${t.total_cost_usd !== undefined ? html`<span class="font-tabular-data text-primary font-semibold">Cost of this run: $${t.total_cost_usd.toFixed(6)} · ₹${(t.total_cost_inr ?? 0).toFixed(4)}</span>` : ""}
</div></div>
${t.created_at ? html`<p class="font-label-compact text-label-compact text-on-surface-variant">${timestamp(t.created_at)} · run by ${t.triggered_by ?? ""}${t.application_id ? ` · ${t.application_id}` : " · synthetic sample"}</p>` : ""}
<ol class="flex flex-col gap-space-xs">
${t.steps.map((s, i) => {
  const [label, cls, ico] = CHIP[s.status] ?? CHIP.info;
  return html`<li class="rounded-lg bg-surface-container-low p-space-sm flex flex-col gap-1">
<div class="flex items-start gap-space-sm">
<span class="font-tabular-data text-tabular-data text-on-surface-variant w-6 shrink-0">${i + 1}.</span>
<span class="px-2 py-0.5 rounded-full font-label-compact text-label-compact font-bold flex items-center gap-1 shrink-0 ${cls}">${icon(ico, "text-[12px]")}${label}</span>
<div class="flex flex-col min-w-0"><span class="font-label-default text-label-default text-on-surface font-semibold">${s.step}</span>
<span class="font-body-compact text-body-compact text-on-surface-variant break-words">${s.detail}</span></div>
</div>
${s.data?.system || s.data?.user ? html`<details class="ml-8"><summary class="font-label-compact text-label-compact text-primary cursor-pointer">Show exact prompt sent (names already redacted)</summary>
<pre class="mt-1 p-space-sm rounded bg-surface-container-lowest whitespace-pre-wrap font-body-compact text-body-compact"><strong>System:</strong>
${s.data.system ?? ""}

<strong>User:</strong>
${s.data.user ?? ""}</pre></details>` : ""}
${s.data?.output ? html`<details class="ml-8"><summary class="font-label-compact text-label-compact text-primary cursor-pointer">Show model output</summary>
<pre class="mt-1 p-space-sm rounded bg-surface-container-lowest whitespace-pre-wrap font-body-compact text-body-compact">${s.data.output}</pre></details>` : ""}
</li>`;
})}
</ol></section>`;
}
