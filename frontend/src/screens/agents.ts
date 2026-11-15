/** AI Agent Workbench (AI Agent Owner, separate login). Not in the Stitch export: added for
 *  the AI governance requirement, built from the same tokens and components as screen E.
 *  Run any agent on a synthetic input with an unsaved prompt, see the full trace and cost,
 *  save the prompt as a new version, restore old versions, and review costs so far. */

import { api, ApiError } from "../api";
import { html, icon, raw, type SafeHtml } from "../html";
import { loadRbac, rbacTable } from "../rbac";
import { traceView, type Trace } from "../trace";
import { timestamp } from "../format";
import type { Route } from "../router";
import type { Ctx } from "../main";
import { governanceView, wireGovernance, type Governance, type TaskRow } from "./oversight";

interface TestResult {
  status: string;
  error?: string;
  input: string;
  output?: string;
  trace: Trace | null;
}

let lastResult: TestResult | null = null;

export async function renderAgents(ctx: Ctx, _route: Route): Promise<void> {
  const [gov, runs, traces, rbac] = await Promise.all([
    api.get<Governance>("/api/agents"),
    api.get<TaskRow[]>("/api/agent-runs?limit=25"),
    api.get<Trace[]>("/api/agent-traces?limit=15"),
    loadRbac(),
  ]);
  ctx.root.innerHTML = view(ctx, gov, runs, traces, rbac).value;
  const rerender = () => renderAgents(ctx, _route);
  wireGovernance(ctx, gov, rerender);

  wireTraceButtons(ctx);
  const agentSel = ctx.root.querySelector<HTMLSelectElement>("#wb-agent");
  const promptBox = ctx.root.querySelector<HTMLTextAreaElement>("#wb-prompt");
  if (!agentSel || !promptBox) return; // read-only roles (e.g. CFO Office) have no run panel
  agentSel.addEventListener("change", () => {
    const a = gov.agents.find((x) => x.agent_key === agentSel.value);
    if (a) promptBox.value = a.config.prompt;
  });
  ctx.root.querySelector("#wb-reset")?.addEventListener("click", () => {
    const a = gov.agents.find((x) => x.agent_key === agentSel.value);
    if (a) promptBox.value = a.config.prompt;
  });
  ctx.root.querySelector<HTMLButtonElement>("#wb-run")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = "Running…";
    try {
      lastResult = await api.post<TestResult>(`/api/agents/${agentSel.value}/test`, {
        prompt: promptBox.value,
        tone: (ctx.root.querySelector("#wb-tone") as HTMLSelectElement).value,
      });
      ctx.toast(lastResult.status === "ok" ? `Done · $${lastResult.trace?.total_cost_usd.toFixed(6)}` : `Failed: ${lastResult.error}`);
    } catch (err) {
      ctx.toast(err instanceof ApiError ? err.message : "Run failed");
    }
    const keepAgent = agentSel.value;
    const keepPrompt = promptBox.value;
    await rerender();
    (ctx.root.querySelector("#wb-agent") as HTMLSelectElement).value = keepAgent;
    (ctx.root.querySelector("#wb-prompt") as HTMLTextAreaElement).value = keepPrompt;
    document.getElementById("wb-result")?.scrollIntoView({ block: "start" });
  });
  ctx.root.querySelector<HTMLButtonElement>("#wb-save")?.addEventListener("click", async () => {
    const note = (ctx.root.querySelector("#wb-note") as HTMLInputElement).value.trim();
    const err = ctx.root.querySelector("#wb-error")!;
    if (note.length < 3) {
      err.textContent = "Add a reason for the change (recorded with the new version).";
      err.classList.remove("hidden");
      return;
    }
    try {
      await api.patch(`/api/agents/${agentSel.value}`, {
        prompt: promptBox.value,
        tone: (ctx.root.querySelector("#wb-tone") as HTMLSelectElement).value,
        note,
      });
      ctx.toast("Prompt saved as a new version. Live on the next call.");
      await rerender();
    } catch (ex) {
      err.textContent = ex instanceof ApiError ? ex.message : "Could not save";
      err.classList.remove("hidden");
    }
  });
}


function wireTraceButtons(ctx: Ctx): void {
  ctx.root.querySelectorAll<HTMLButtonElement>("[data-trace]").forEach((b) =>
    b.addEventListener("click", async () => {
      const box = document.getElementById(`trace-${b.dataset.trace}`)!;
      if (box.innerHTML) {
        box.innerHTML = "";
        return;
      }
      const t = await api.get<Trace>(`/api/agent-traces/${b.dataset.trace}`);
      box.innerHTML = traceView(t, t.kind === "pipeline" ? "Document-chase agent run" : "Agent task").value;
    }),
  );

}

function view(ctx: Ctx, gov: Governance, runs: TaskRow[], traces: Trace[], rbac: Awaited<ReturnType<typeof loadRbac>>): SafeHtml {
  const first = gov.agents.find((a) => a.agent_key === "reminder_rewriter") ?? gov.agents[0]!;
  const canTest = gov.can_test;
  const r = lastResult;
  return html`<section class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mb-space-lg">
<div class="flex flex-col gap-0.5">
<div class="flex items-center gap-space-xs text-on-surface-variant font-label-compact text-label-compact uppercase tracking-wider">${icon("smart_toy", "text-[16px] text-primary")}<span>${ctx.session.user.role_label}</span><span class="text-outline-variant" aria-hidden="true">/</span><span>${canTest ? "Separate login" : "Read-only"}</span></div>
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">${canTest ? "AI Agent Workbench" : "AI Cost & Governance"}</h1>
<p class="font-body-compact text-body-compact text-on-surface-variant">${canTest ? "Run an agent on an input, see every security check, prompt, model call, fallback and cost, then save or roll back the prompt." : "What the AI agents have cost so far, which models served each call, and every configuration change. Read-only."} Signed in as ${ctx.session.user.name}. This role sees no client files and no audit log.</p>
</div>
<div class="flex items-center gap-space-sm flex-wrap font-label-compact text-label-compact">
<span class="px-space-sm py-1 rounded-full ${gov.enabled ? "bg-secondary-container text-on-secondary-fixed" : "bg-error-container text-on-error-container"} font-semibold">${gov.enabled ? "AI agents on" : "AI disabled (FEATURE_AI_DRAFTING=false)"}</span>
<span class="px-space-sm py-1 rounded-full bg-surface-container-high">Gemini key: ${gov.keys.gemini ? "set" : "not set"}</span>
<span class="px-space-sm py-1 rounded-full bg-surface-container-high">Anthropic key: ${gov.keys.anthropic ? "set" : "not set"}</span>
${gov.simulated_mode ? html`<span class="px-space-sm py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-semibold">Missing keys → simulator</span>` : ""}
</div></section>

${canTest ? html`<section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md mb-space-xl" aria-labelledby="wb-title">
<h2 id="wb-title" class="font-headline-md text-headline-md flex items-center gap-space-xs">${icon("play_circle", "text-primary text-[22px]")}Run an input</h2>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
<div class="flex flex-col gap-space-sm">
<div class="grid grid-cols-2 gap-space-sm">
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Agent</span>
<select id="wb-agent" class="h-8 px-space-xs rounded bg-surface-container-low">${gov.agents.map((a) => html`<option value="${a.agent_key}" ${a.agent_key === first.agent_key ? raw("selected") : ""}>${a.display_name} (v${a.version})</option>`)}</select></label>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Tone</span>
<select id="wb-tone" class="h-8 px-space-xs rounded bg-surface-container-low">${gov.tones.map((t) => html`<option value="${t}" ${t === first.config.tone ? raw("selected") : ""}>${t}</option>`)}</select></label>
</div>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Prompt (editable; not saved until you click Save. {tone} is replaced; guardrails are appended by the server)</span>
<textarea id="wb-prompt" rows="8" class="p-space-sm rounded bg-surface-container-low font-body-compact text-body-compact">${first.config.prompt}</textarea></label>
<div class="flex flex-wrap gap-space-sm items-center">
<button type="button" id="wb-run" ${canTest ? "" : raw("disabled")} class="h-9 px-space-md rounded bg-primary text-on-primary hover:bg-primary-container font-label-default text-label-default flex items-center gap-1.5 disabled:opacity-50">${icon("play_arrow")} Run with this prompt</button>
<button type="button" id="wb-reset" class="h-9 px-space-md rounded bg-surface-container-high font-label-default text-label-default">Reset to live prompt</button>
</div>
<div class="flex flex-col gap-1 p-space-sm rounded-lg bg-surface-container-low">
<label for="wb-note" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Reason for change (recorded)</label>
<div class="flex gap-space-xs"><input id="wb-note" class="flex-1 h-8 px-space-xs rounded bg-surface-container-lowest" placeholder="e.g. Shorter, friendlier wording after test"/>
<button type="button" id="wb-save" ${gov.editable_fields.includes("prompt") ? "" : raw("disabled")} class="h-8 px-space-md rounded bg-primary-container text-on-primary font-label-default text-label-default disabled:opacity-50">Save prompt + tone as new version</button></div>
<p id="wb-error" role="alert" class="hidden text-error font-label-default text-label-default"></p>
</div>
</div>
<div class="flex flex-col gap-space-sm">
<span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Input (synthetic sample reminder; names are placeholders)</span>
<pre class="p-space-sm rounded bg-surface-container-low whitespace-pre-wrap font-body-compact text-body-compact">${r?.input ?? "Dear [[CONTACT]],\n\nRegarding your application KF-2026-0000 for [[CLIENT]]:\n\nTo continue with your application, we need the following documents:\n\n1. Current account statement (last 12 months)\n2. GSTR-3B returns (last 6 months)\n\nPlease share these documents by Friday, 20 Nov 2026.\n\nIf you have any questions, please contact your Relationship Manager, Sample RM.\n\nKestrel Finance, SME Lending"}</pre>
${r ? html`<span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Output</span>
<pre class="p-space-sm rounded ${r.status === "ok" ? "bg-secondary-container/40" : "bg-error-container/40"} whitespace-pre-wrap font-body-compact text-body-compact">${r.output ?? r.error ?? ""}</pre>` : html`<p class="font-body-compact text-body-compact text-on-surface-variant">Run the agent to see its output and the full trace here.</p>`}
</div></div>
<div id="wb-result">${r?.trace ? traceView(r.trace, "Trace of this run") : ""}</div>
</section>` : html``}

${governanceView(gov, runs)}

<section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm mt-space-xl" aria-labelledby="tr-title">
<h2 id="tr-title" class="font-headline-md text-headline-md flex items-center gap-space-xs">${icon("account_tree", "text-primary text-[22px]")}Recent agent traces</h2>
<p class="font-body-compact text-body-compact text-on-surface-variant">Every agent task and every document-chase run is traced step by step. Open one to see the checks, prompts, model calls and costs.</p>
<ul class="flex flex-col gap-space-xs">
${traces.length ? traces.map((t) => html`<li class="rounded-lg bg-surface-container-low p-space-sm flex flex-col gap-space-xs">
<div class="flex items-center justify-between gap-space-sm flex-wrap">
<span class="font-body-compact text-body-compact"><strong>${t.kind === "pipeline" ? "Document-chase agent" : t.agent_key === "reminder_critic" ? "Critic task" : "Rewriter task"}</strong> · ${timestamp(t.created_at)} · ${t.triggered_by} · ${t.application_id ?? "synthetic sample"} · ${(t as Trace & { steps_count?: number }).steps_count ?? t.steps.length} steps</span>
<span class="flex items-center gap-space-sm"><span class="font-tabular-data text-tabular-data text-primary">$${t.total_cost_usd.toFixed(6)}</span>
<span class="px-2 py-0.5 rounded-full font-label-compact text-label-compact font-bold uppercase ${t.status === "ok" ? "bg-secondary-container text-on-secondary-fixed" : "bg-error-container text-on-error-container"}">${t.status}</span>
<button type="button" data-trace="${t.task_id}" class="h-7 px-space-sm rounded bg-surface-container-high font-label-compact text-label-compact">View trace</button></span></div>
<div id="trace-${t.task_id}"></div></li>`) : html`<li class="text-on-surface-variant">No traces yet.</li>`}
</ul></section>

<section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm mt-space-xl" aria-labelledby="rbac-title">
<h2 id="rbac-title" class="font-headline-md text-headline-md flex items-center gap-space-xs">${icon("admin_panel_settings", "text-primary text-[22px]")}Role-based access control</h2>
${rbacTable(rbac)}
</section>`;
}
