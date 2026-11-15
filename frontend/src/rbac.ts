/** Renders the RBAC permission matrix the server enforces (from /api/rbac). */

import { api } from "./api";
import { html, icon, type SafeHtml } from "./html";

export interface Rbac {
  roles: { id: string; label: string }[];
  permissions: { id: string; description: string; roles: Record<string, string> }[];
  you: { role: string; permissions: string[] };
}

export async function loadRbac(): Promise<Rbac> {
  return api.get<Rbac>("/api/rbac");
}

export function rbacTable(m: Rbac): SafeHtml {
  const scopeText: Record<string, string> = { all: "All", own: "Own", assigned: "Assigned" };
  return html`<div class="overflow-x-auto"><table class="w-full font-body-compact text-body-compact" style="min-width:820px">
<caption class="text-left font-label-default text-label-default pb-space-xs">Permission matrix enforced on every API call. "Own" = the RM's portfolio or the RM named on a draft; "Assigned" = the analyst's files. Your role is highlighted.</caption>
<thead><tr class="bg-surface-container-high/60 text-on-surface-variant font-label-compact text-label-compact uppercase">
<th scope="col" class="text-left px-2 py-1">Permission</th>
${m.roles.map((r) => html`<th scope="col" class="px-2 py-1 text-center ${r.id === m.you.role ? "bg-primary-fixed text-on-primary-fixed" : ""}">${r.label}</th>`)}
</tr></thead>
<tbody class="divide-y divide-surface-container-high">
${m.permissions.map(
  (p) => html`<tr><th scope="row" class="text-left px-2 py-1 font-normal"><span class="font-tabular-data text-tabular-data text-primary">${p.id}</span><br/><span class="text-on-surface-variant">${p.description}</span></th>
${m.roles.map((r) => {
  const sc = p.roles[r.id];
  return html`<td class="text-center px-2 ${r.id === m.you.role ? "bg-primary-fixed/40" : ""}">${sc
    ? html`<span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-compact text-label-compact font-semibold">${icon("check", "text-[12px]")}${scopeText[sc] ?? sc}</span>`
    : html`<span class="text-on-surface-variant" aria-label="not allowed">—</span>`}</td>`;
})}</tr>`,
)}
</tbody></table></div>`;
}
