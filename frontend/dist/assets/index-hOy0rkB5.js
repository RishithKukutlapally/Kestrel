import"./styles-13Dood97.js";var e=class extends Error{status;constructor(e,t){super(t),this.status=e}};async function t(t,n,r){let i=await fetch(n,{method:t,credentials:`same-origin`,headers:r===void 0?{}:{"Content-Type":`application/json`},body:r===void 0?void 0:JSON.stringify(r)});if(i.status===401)throw window.location.assign(`/login`),new e(401,`login required`);let a=i.headers.get(`content-type`)?.includes(`application/json`)?await i.json():null;if(!i.ok){let t=a&&typeof a.detail==`string`?a.detail:`Request failed (${i.status})`;throw new e(i.status,t)}return a}var n={get:e=>t(`GET`,e),post:(e,n={})=>t(`POST`,e,n),patch:(e,n)=>t(`PATCH`,e,n)},r=class{value;constructor(e){this.value=e}toString(){return this.value}},i={"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`};function a(e){return e.replace(/[&<>"']/g,e=>i[e])}function o(e){return e==null||e===!1?``:Array.isArray(e)?e.map(o).join(``):e instanceof r?e.value:a(String(e))}function s(e,...t){let n=e[0];return t.forEach((t,r)=>{n+=o(t)+e[r+1]}),new r(n)}function c(e){return new r(e)}function l(e,t=`text-[16px]`){return s`<span class="material-symbols-outlined ${t}" aria-hidden="true">${e}</span>`}async function u(){return n.get(`/api/rbac`)}function d(e){let t={all:`All`,own:`Own`,assigned:`Assigned`};return s`<div class="overflow-x-auto"><table class="w-full font-body-compact text-body-compact" style="min-width:820px">
<caption class="text-left font-label-default text-label-default pb-space-xs">Permission matrix enforced on every API call. "Own" = the RM's portfolio or the RM named on a draft; "Assigned" = the analyst's files. Your role is highlighted.</caption>
<thead><tr class="bg-surface-container-high/60 text-on-surface-variant font-label-compact text-label-compact uppercase">
<th scope="col" class="text-left px-2 py-1">Permission</th>
${e.roles.map(t=>s`<th scope="col" class="px-2 py-1 text-center ${t.id===e.you.role?`bg-primary-fixed text-on-primary-fixed`:``}">${t.label}</th>`)}
</tr></thead>
<tbody class="divide-y divide-surface-container-high">
${e.permissions.map(n=>s`<tr><th scope="row" class="text-left px-2 py-1 font-normal"><span class="font-tabular-data text-tabular-data text-primary">${n.id}</span><br/><span class="text-on-surface-variant">${n.description}</span></th>
${e.roles.map(r=>{let i=n.roles[r.id];return s`<td class="text-center px-2 ${r.id===e.you.role?`bg-primary-fixed/40`:``}">${i?s`<span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-compact text-label-compact font-semibold">${l(`check`,`text-[12px]`)}${t[i]??i}</span>`:s`<span class="text-on-surface-variant" aria-label="not allowed">—</span>`}</td>`})}</tr>`)}
</tbody></table></div>`}var f=330;function p(e){let t=new Date(e.getTime()+f*6e4);return{y:t.getUTCFullYear(),m:t.getUTCMonth(),day:t.getUTCDate(),h:t.getUTCHours(),min:t.getUTCMinutes()}}var m=[`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`,`Jul`,`Aug`,`Sep`,`Oct`,`Nov`,`Dec`];function h(e){let t=p(e);return`${t.y}-${String(t.m+1).padStart(2,`0`)}-${String(t.day).padStart(2,`0`)}`}function g(e){return new Date(`${e}T06:30:00Z`)}function _(e){let t=p(e.length===10?g(e):new Date(e));return`${String(t.day).padStart(2,`0`)} ${m[t.m]}`}function v(e){let t=p(e.length===10?g(e):new Date(e));return`${String(t.day).padStart(2,`0`)} ${m[t.m]} ${t.y}`}function y(e){let t=p(new Date(e)),n=t.h>=12?`PM`:`AM`,r=t.h%12==0?12:t.h%12;return`${String(r).padStart(2,`0`)}:${String(t.min).padStart(2,`0`)} ${n}`}function b(e,t=new Date){let n=e.length===10?e:h(new Date(e)),r=h(t),i=Math.round((g(n).getTime()-g(r).getTime())/864e5);return i===0?`Today`:i===1?`Tomorrow`:i===-1?`Yesterday`:v(n)}function x(e,t=new Date){let n=b(e,t);return`${n===`Today`||n===`Yesterday`||n===`Tomorrow`?n:_(e)}, ${y(e)}`}function ee(e){let t=p(new Date(e)),n=new Date(e).getUTCSeconds();return`${v(e)}, ${String(t.h).padStart(2,`0`)}:${String(t.min).padStart(2,`0`)}:${String(n).padStart(2,`0`)}`}function S(e,t,n=`${t}s`){return`${e} ${e===1?t:n}`}function te(e){return e.split(/\s+/).filter(Boolean).slice(0,2).map(e=>e[0].toUpperCase()).join(``)}function C(e){return String(e).padStart(2,`0`)}var w={pass:[`PASS`,`bg-secondary-container text-on-secondary-fixed`,`check_circle`],fail:[`FAIL`,`bg-error-container text-on-error-container`,`cancel`],info:[`INFO`,`bg-surface-container-high text-on-surface`,`info`],skip:[`SKIP`,`bg-surface-container text-on-surface-variant`,`skip_next`]};function T(e,t=`Agent trace`){return s`<section class="rounded-xl bg-surface-container-lowest p-space-md flex flex-col gap-space-sm" aria-label="${t}">
<div class="flex items-center justify-between flex-wrap gap-space-xs">
<h3 class="font-headline-sm text-headline-sm flex items-center gap-space-xs">${l(`account_tree`,`text-primary text-[20px]`)}${t}</h3>
<div class="flex items-center gap-space-sm font-label-default text-label-default">
${e.status?s`<span class="px-space-sm py-0.5 rounded-full font-bold uppercase ${e.status===`ok`?`bg-secondary-container text-on-secondary-fixed`:e.status===`partial`?`bg-tertiary-fixed text-on-tertiary-fixed-variant`:`bg-error-container text-on-error-container`}">${e.status===`ok`?`Completed`:e.status===`partial`?`Partial (template kept)`:`Failed`}</span>`:``}
${e.total_cost_usd===void 0?``:s`<span class="font-tabular-data text-primary font-semibold">Cost of this run: $${e.total_cost_usd.toFixed(6)} · ₹${(e.total_cost_inr??0).toFixed(4)}</span>`}
</div></div>
${e.created_at?s`<p class="font-label-compact text-label-compact text-on-surface-variant">${x(e.created_at)} · run by ${e.triggered_by??``}${e.application_id?` · ${e.application_id}`:` · synthetic sample`}</p>`:``}
<ol class="flex flex-col gap-space-xs">
${e.steps.map((e,t)=>{let[n,r,i]=w[e.status]??w.info;return s`<li class="rounded-lg bg-surface-container-low p-space-sm flex flex-col gap-1">
<div class="flex items-start gap-space-sm">
<span class="font-tabular-data text-tabular-data text-on-surface-variant w-6 shrink-0">${t+1}.</span>
<span class="px-2 py-0.5 rounded-full font-label-compact text-label-compact font-bold flex items-center gap-1 shrink-0 ${r}">${l(i,`text-[12px]`)}${n}</span>
<div class="flex flex-col min-w-0"><span class="font-label-default text-label-default text-on-surface font-semibold">${e.step}</span>
<span class="font-body-compact text-body-compact text-on-surface-variant break-words">${e.detail}</span></div>
</div>
${e.data?.system||e.data?.user?s`<details class="ml-8"><summary class="font-label-compact text-label-compact text-primary cursor-pointer">Show exact prompt sent (names already redacted)</summary>
<pre class="mt-1 p-space-sm rounded bg-surface-container-lowest whitespace-pre-wrap font-body-compact text-body-compact"><strong>System:</strong>
${e.data.system??``}

<strong>User:</strong>
${e.data.user??``}</pre></details>`:``}
${e.data?.output?s`<details class="ml-8"><summary class="font-label-compact text-label-compact text-primary cursor-pointer">Show model output</summary>
<pre class="mt-1 p-space-sm rounded bg-surface-container-lowest whitespace-pre-wrap font-body-compact text-body-compact">${e.data.output}</pre></details>`:``}
</li>`})}
</ol></section>`}var ne=[`queue`,`checklist`,`composer`,`analyst`,`oversight`,`agents`],re=/^KF-2026-\d{4}$/;function ie(e){let[t,n=``]=e.replace(/^#\/?/,``).split(`?`,2),[r,i]=t.split(`/`);return ne.includes(r)?{screen:r,id:i&&re.test(decodeURIComponent(i))?decodeURIComponent(i):null,params:new URLSearchParams(n)}:null}function E(e,t,n){let r=n?new URLSearchParams(Object.entries(n).filter(([,e])=>e)).toString():``;return`#/${e}${t?`/${t}`:``}${r?`?${r}`:``}`}var ae={overdue:`bg-error-container text-on-error-container`,due_today:`bg-tertiary-fixed text-on-tertiary-fixed-variant`,on_track:`bg-surface-container-high text-on-surface font-semibold`,complete:`bg-secondary-container text-on-secondary-fixed font-semibold`},oe={overdue:`bg-error text-on-error`,due_today:`bg-tertiary-fixed text-on-tertiary-fixed-variant`,on_track:`bg-surface-container-high text-on-tertiary-fixed-variant`,received:`bg-surface-container-high text-primary`,waived:`bg-surface-container-high text-on-surface-variant`};function se(e,t){return e===`overdue`?{text:`${t}d overdue`,cls:`bg-error-container text-on-error-container`}:e===`due_today`?{text:`Due today`,cls:`bg-tertiary-fixed text-on-tertiary-fixed-variant`}:null}var ce={analyst_blocked:`bg-tertiary-container/15 text-tertiary`,doc_collection:`bg-surface-container-high text-on-surface`,complete:`bg-secondary-container text-on-secondary-fixed`},le={overdue:`bg-error`,due_today:`bg-tertiary`,on_track:`bg-outline`,received:`bg-primary`,waived:`bg-outline-variant`},ue={request_created:`bg-surface-container text-secondary`,reminder_drafted:`bg-surface-container-high text-on-surface-variant`,reminder_approved:`bg-secondary-container text-on-secondary-fixed`,reminder_sent:`bg-primary-fixed text-on-primary-fixed`,document_received:`bg-surface-container-highest text-primary`,item_waived:`bg-surface-container-high text-on-surface-variant`,file_marked_complete:`bg-secondary-container text-on-secondary-fixed`},de=[[`request_created`,`Request Created`],[`reminder_drafted`,`Reminder Drafted`],[`reminder_approved`,`Reminder Approved`],[`reminder_sent`,`Reminder Sent`],[`document_received`,`Document Received`],[`item_waived`,`Item Waived`],[`file_marked_complete`,`File Marked Complete`]];async function D(e,t){let r=t.params,i=new URLSearchParams;r.get(`q`)&&i.set(`q`,r.get(`q`)),r.get(`type`)&&i.set(`type`,r.get(`type`)),r.get(`days`)&&i.set(`days`,r.get(`days`)),i.set(`limit`,`25`),i.set(`offset`,String(Number(r.get(`page`)??`0`)*25));let[a,o,s,c,l]=await Promise.all([n.get(`/api/oversight/summary`),n.get(`/api/audit?${i}`),n.get(`/api/audit/verify`),n.get(`/api/agents`),n.get(`/api/agent-runs?limit=25`)]);e.root.innerHTML=pe(a,o,s,c,l,r).value,fe(e,r,c)}function O(e,t,n){let r=new URLSearchParams(e);return n?r.set(t,n):r.delete(t),r.delete(`page`),E(`oversight`,void 0,Object.fromEntries(r))}function fe(e,t,n){let r=e.root,i=r.querySelector(`#auditSearchInput`),a;i.addEventListener(`input`,()=>{window.clearTimeout(a),a=window.setTimeout(()=>e.go(O(t,`q`,i.value.trim())),350)}),r.querySelectorAll(`select[data-param]`).forEach(n=>n.addEventListener(`change`,()=>e.go(O(t,n.dataset.param,n.value)))),r.querySelector(`#reset-filters`)?.addEventListener(`click`,()=>e.go(E(`oversight`))),r.querySelector(`#export-csv`)?.addEventListener(`click`,()=>{let e=new URLSearchParams;for(let n of[`q`,`type`,`days`])t.get(n)&&e.set(n,t.get(n));window.location.assign(`/api/audit.csv?${e}`)}),r.querySelectorAll(`[data-copy]`).forEach(t=>t.addEventListener(`click`,async()=>{try{await navigator.clipboard.writeText(t.dataset.copy),e.toast(`Hash copied to clipboard`)}catch{e.toast(t.dataset.copy)}})),k(e,n,()=>D(e,{screen:`oversight`,id:null,params:t}))}function k(t,r,i){let a=t.root,o=new Set(r.editable_fields??[]);a.querySelectorAll(`form[data-agent]`).forEach(a=>{let l=a.dataset.agent,u=e=>{let t=a.querySelector(`[name=${e}_provider]`),n=a.querySelector(`[name=${e}_model]`),i=r.catalogue[t.value]??[],o=n.value;n.innerHTML=i.map(e=>s`<option value="${e}" ${e===o?c(`selected`):``}>${e}</option>`.value).join(``)};a.querySelector(`[name=primary_provider]`)?.addEventListener(`change`,()=>u(`primary`)),a.querySelector(`[name=fallback_provider]`)?.addEventListener(`change`,()=>u(`fallback`)),a.addEventListener(`submit`,async r=>{r.preventDefault();let s=new FormData(a),c={enabled:s.get(`enabled`)===`on`,simulate_primary_outage:s.get(`simulate_primary_outage`)===`on`,primary_provider:s.get(`primary_provider`),primary_model:s.get(`primary_model`),fallback_provider:s.get(`fallback_provider`),fallback_model:s.get(`fallback_model`),tone:s.get(`tone`),prompt:s.get(`prompt`),task_price_inr:Number(s.get(`task_price_inr`)),outcome_price_inr:Number(s.get(`outcome_price_inr`)),monthly_budget_usd:Number(s.get(`monthly_budget_usd`)),timeout_seconds:Number(s.get(`timeout_seconds`))},u={note:String(s.get(`note`)??``)};for(let[e,t]of Object.entries(c))o.has(e)&&t!==null&&(u[e]=t);let d=a.querySelector(`.form-error`);try{await n.patch(`/api/agents/${l}`,u),t.toast(`Saved as a new version. It applies to the next call; no deploy or restart.`),await i(),document.getElementById(`agent-${l}`)?.scrollIntoView()}catch(t){d.textContent=t instanceof e?t.message:`Could not save`,d.classList.remove(`hidden`)}})}),a.querySelectorAll(`[data-restore]`).forEach(r=>r.addEventListener(`click`,async()=>{let[a,o]=r.dataset.restore.split(`:`);try{await n.post(`/api/agents/${a}/restore`,{version:Number(o),note:`Restore v${o}`}),t.toast(`Restored v${o} as a new version. Live on the next call.`),await i(),document.getElementById(`agent-${a}`)?.scrollIntoView()}catch(n){t.toast(n instanceof e?n.message:`Could not restore`)}}))}function A(e,t){return t?`${(100*e/t).toFixed(1)}%`:`0%`}function j(e,t,n,r,i,a=`text-on-surface`){return s`<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
<div class="flex items-start justify-between"><div>
<span class="font-label-compact text-label-compact uppercase text-on-surface-variant tracking-wider">${e}</span>
<div class="flex items-baseline gap-space-xs mt-1"><span class="font-headline-lg text-headline-lg ${a}">${t}</span><span class="font-label-default text-label-default text-secondary">${n}</span></div>
</div><div class="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">${l(r,`text-[20px]`)}</div></div>
<div class="mt-space-md pt-space-xs">${i}</div></div>`}function pe(e,t,n,r,i,a){let o=e.active_files+e.complete_files,u=[[`0–3 DAYS`,`0-3`,`Healthy`,`bg-primary`],[`4–7 DAYS`,`4-7`,`Attention required`,`bg-secondary`],[`8–14 DAYS`,`8-14`,`Escalated follow-up`,`bg-tertiary`],[`>14 DAYS`,`15+`,`Critical stall`,`bg-error`]],d=Number(a.get(`page`)??`0`);return s`<section class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mb-space-lg">
<div class="flex flex-col gap-0.5">
<div class="flex items-center gap-space-xs text-on-surface-variant font-label-compact text-label-compact uppercase tracking-wider">${l(`security`,`text-[16px] text-primary`)}<span>Oversight</span><span class="text-outline-variant" aria-hidden="true">/</span><span>Credit Manager &amp; CRO</span></div>
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Document Tracking Oversight &amp; Audit</h1>
<p class="font-body-compact text-body-compact text-on-surface-variant">Counts and the audit log only. No client names, amounts or other client-level data.</p>
</div>
<div class="flex items-center gap-space-sm flex-wrap">
<div class="flex items-center gap-1.5 px-space-md py-1.5 bg-surface-container rounded-lg text-on-surface font-label-default text-label-default"><span class="w-2 h-2 rounded-full ${n.ok?`bg-primary`:`bg-error`}" aria-hidden="true"></span><span class="font-tabular-data text-tabular-data">Hash chain: ${n.ok?`verified (${n.events_checked} events)`:`BROKEN`}</span></div>
<button type="button" id="export-csv" class="flex items-center gap-space-xs px-space-md py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg font-label-default text-label-default transition-colors">${l(`file_download`)}<span>Export CSV</span></button>
<a href="#ai-governance" class="flex items-center gap-space-xs px-space-md py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-default text-label-default">${l(`smart_toy`)}<span>AI agent governance</span></a>
</div></section>

<section aria-label="Pipeline counts" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-xl">
${j(`Total Active Loan Files`,String(e.active_files),`Files`,`folder_managed`,s`<div class="flex items-center justify-between bg-surface-container-low rounded p-1.5 px-2 font-body-compact text-body-compact"><span class="text-on-surface-variant">Complete</span><span class="font-tabular-data font-semibold">${e.complete_files}</span></div>`)}
${j(`Files With Overdue Items`,String(e.files_with_overdue_items),`Files`,`rule_folder`,s`<div class="flex flex-col gap-1"><div class="flex justify-between items-center font-body-compact text-body-compact"><span class="text-on-surface-variant">Share of active</span><span class="font-tabular-data font-semibold text-error">${e.overdue_share_pct}%</span></div><div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden"><div class="h-full bg-error rounded-full" style="width:${e.overdue_share_pct}%"></div></div></div>`,`text-error`)}
${j(`Reminders Sent (30D)`,String(e.reminders_sent_30d),`Sent`,`verified`,s`<div class="flex items-center justify-between bg-surface-container-low rounded p-1.5 px-2"><span class="flex items-center gap-1 font-body-compact text-body-compact text-primary font-medium">${l(`how_to_reg`,`text-[14px]`)}${e.reminders_approved_30d} approved by named RM</span><span class="font-label-compact text-label-compact px-1.5 py-0.5 rounded ${e.sent_without_named_rm_approval?`bg-error-container text-on-error-container`:`bg-surface-container-high text-on-surface-variant`}">${e.sent_without_named_rm_approval} without approval</span></div>`)}
${j(`Avg Document Turnaround`,e.avg_turnaround_days===null?`–`:String(e.avg_turnaround_days),`Days`,`timelapse`,s`<div class="flex items-center justify-between font-body-compact text-body-compact bg-surface-container-low rounded p-1.5 px-2"><span class="text-on-surface-variant">Approved without edits</span><span class="font-tabular-data">${e.approved_without_edits_pct===null?`–`:`${e.approved_without_edits_pct}%`}</span></div>`,`text-tertiary`)}
</section>

<section class="grid grid-cols-1 lg:grid-cols-12 gap-space-md mb-space-xl">
<div class="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-space-md"><div><h2 class="font-headline-sm text-headline-sm text-on-surface">Waiting Breakdown by Oldest Outstanding Item</h2>
<p class="font-body-compact text-body-compact text-on-surface-variant">Across ${e.active_files} active files, from the event log</p></div></div>
<div class="grid grid-cols-2 md:grid-cols-4 gap-space-sm mb-space-md">
${u.map(([t,n,r,i])=>{let a=e.ageing_buckets[n],o=n===`15+`;return s`<div class="${o?`bg-error-container/30`:`bg-surface-container-low`} rounded-lg p-space-md flex flex-col justify-between">
<div class="flex items-center justify-between ${o?`text-error`:`text-on-surface-variant`}"><span class="font-label-compact text-label-compact font-semibold">${t}</span><span class="w-2 h-2 rounded-full ${i}" aria-hidden="true"></span></div>
<div class="my-space-sm"><div class="font-headline-md text-headline-md ${o?`text-error`:`text-on-surface`}">${a}</div><div class="font-body-compact text-body-compact ${o?`text-error font-medium`:`text-on-surface-variant`} leading-tight">${r}</div></div>
<div class="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden"><div class="${i} h-full rounded-full" style="width:${A(a,e.active_files)}"></div></div>
<span class="font-label-compact text-label-compact ${o?`text-error`:`text-on-surface-variant`} text-right mt-1">${A(a,e.active_files)}</span></div>`})}
</div>
${e.critical_stall_count?s`<div class="bg-error-container/40 rounded-lg p-space-sm px-space-md flex items-center gap-space-sm">${l(`warning`,`text-error text-[18px]`)}<span class="font-label-default text-label-default text-on-error-container">${e.critical_stall_count} ${e.critical_stall_count===1?`file has`:`files have`} waited more than 14 days (client names withheld from oversight).</span></div>`:``}
</div>
<div class="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-space-sm"><h2 class="font-headline-sm text-headline-sm text-on-surface">Stage Distribution</h2><span class="font-label-compact text-label-compact text-on-surface-variant">All Files: ${o}</span></div>
<div class="space-y-space-md my-auto">
${[[`Doc Collection`,e.stages.doc_collection,`bg-primary-container`,`text-on-surface`],[`Analyst Blocked`,e.stages.analyst_blocked,`bg-error`,`text-error`],[`Complete`,e.stages.complete,`bg-secondary`,`text-on-surface`]].map(([e,t,n,r])=>s`<div class="flex flex-col gap-1"><div class="flex items-center justify-between"><div class="flex items-center gap-space-xs"><span class="w-3 h-3 rounded ${n}" aria-hidden="true"></span><span class="font-body-default text-body-default font-medium ${r}">${e}</span></div>
<div class="flex items-center gap-space-sm font-tabular-data text-tabular-data"><span class="font-semibold ${r}">${t} files</span><span class="text-on-surface-variant text-label-compact">(${A(t,o)})</span></div></div>
<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden"><div class="${n} h-full rounded-full" style="width:${A(t,o)}"></div></div></div>`)}
</div>
<div class="mt-space-md pt-space-xs font-label-compact text-label-compact text-on-surface-variant flex items-center gap-1">${l(`info`,`text-[14px] text-primary`)} No credit decision is made in this system.</div>
</div></section>

${M(r,i)}

<section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col mt-space-xl" aria-labelledby="audit-title">
<div class="flex flex-col gap-space-md mb-space-md">
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
<div><div class="flex items-center gap-space-xs flex-wrap"><h2 id="audit-title" class="font-headline-md text-headline-md text-on-surface">Searchable Operational Audit Log</h2>
<span class="px-space-sm py-0.5 rounded-full bg-primary/10 text-primary font-label-compact text-label-compact font-semibold">Immutable Append-Only</span></div>
<p class="font-body-compact text-body-compact text-on-surface-variant">Requests, reminder drafts, approvals, sends, receipts, waivers and completions. Each row is SHA-256 chained to the previous one.</p></div>
<span class="px-space-sm py-1 bg-surface-container-low rounded text-on-surface-variant font-label-compact text-label-compact self-start">Showing ${t.events.length} of ${t.total} events</span>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm bg-surface-container-low p-space-sm rounded-lg">
<div class="relative flex items-center">${l(`search`,`absolute left-2.5 text-on-surface-variant text-[16px]`)}<label for="auditSearchInput" class="sr-only">Search the audit log</label>
<input class="w-full h-8 pl-8 pr-3 rounded bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant text-body-compact font-body-compact" id="auditSearchInput" placeholder="Search actor, reason, or KF-2026-..." type="search" value="${a.get(`q`)??``}"/></div>
<div class="relative flex items-center"><label for="f-type" class="sr-only">Event type</label>
<select id="f-type" data-param="type" class="w-full h-8 px-2.5 rounded bg-surface-container-lowest text-on-surface text-body-compact font-body-compact appearance-none"><option value="">All Event Types</option>${de.map(([e,t])=>s`<option value="${e}" ${a.get(`type`)===e?c(`selected`):``}>${t}</option>`)}</select>${l(`expand_more`,`absolute right-2 pointer-events-none text-on-surface-variant`)}</div>
<div class="relative flex items-center"><label for="f-days" class="sr-only">Date range</label>
<select id="f-days" data-param="days" class="w-full h-8 px-2.5 rounded bg-surface-container-lowest text-on-surface text-body-compact font-body-compact appearance-none">${[[``,`Date: All`],[`7`,`Date: Past 7 Days`],[`30`,`Date: Past 30 Days`]].map(([e,t])=>s`<option value="${e}" ${(a.get(`days`)??``)===e?c(`selected`):``}>${t}</option>`)}</select>${l(`calendar_today`,`absolute right-2 pointer-events-none text-on-surface-variant`)}</div>
<button type="button" id="reset-filters" class="h-8 px-space-md rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-default text-label-default flex items-center justify-center gap-1">${l(`restart_alt`,`text-[15px]`)}<span>Reset Filters</span></button>
</div></div>
<div class="overflow-x-auto rounded-lg">
<table class="w-full text-left border-collapse">
<caption class="sr-only">Audit events, newest first</caption>
<thead><tr class="bg-surface-container-high/60 text-on-surface-variant font-label-compact text-label-compact uppercase tracking-wider h-8">
<th scope="col" class="py-1 px-3 w-44 font-semibold">Timestamp (IST)</th><th scope="col" class="py-1 px-3 w-32 font-semibold">Application</th><th scope="col" class="py-1 px-3 w-44 font-semibold">Event Type</th>
<th scope="col" class="py-1 px-3 w-48 font-semibold">Actor (Name &amp; Role)</th><th scope="col" class="py-1 px-3 font-semibold">Action Detail &amp; Reason</th><th scope="col" class="py-1 px-3 w-32 text-right font-semibold">Hash</th>
</tr></thead>
<tbody class="divide-y divide-surface-container-high font-body-compact text-body-compact text-on-surface">
${t.events.length?t.events.map(e=>s`<tr class="hover:bg-surface-container-low transition-colors h-11">
<td class="py-1.5 px-3 font-tabular-data text-tabular-data text-secondary whitespace-nowrap">${ee(e.occurred_at)}</td>
<td class="py-1.5 px-3 font-tabular-data text-tabular-data font-semibold text-primary">${e.application_id??`—`}</td>
<td class="py-1.5 px-3"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-label-compact font-label-compact font-semibold ${ue[e.event_type]??``}">${e.event_label}</span></td>
<td class="py-1.5 px-3"><div class="flex flex-col"><span class="font-medium text-on-surface">${e.actor_name}</span><span class="font-label-compact text-label-compact text-on-surface-variant">${e.actor_role_label}</span></div></td>
<td class="py-1.5 px-3">${e.reason}</td>
<td class="py-1.5 px-3 text-right"><button type="button" data-copy="${e.hash}" class="font-tabular-data text-tabular-data text-primary hover:underline bg-surface-container px-1.5 py-0.5 rounded" title="Copy full SHA-256 hash">#${e.hash.slice(0,10)}</button></td>
</tr>`):s`<tr><td colspan="6" class="py-space-xl text-center"><p class="font-headline-sm text-headline-sm text-on-surface">No audit events match your criteria</p><p class="font-body-compact text-body-compact text-on-surface-variant mt-1">Try adjusting the text query or event type filter.</p></td></tr>`}
</tbody></table></div>
<div class="mt-space-lg pt-space-md border-t border-surface-container-high flex flex-col md:flex-row items-center justify-between gap-space-md">
<div class="flex items-center gap-space-sm text-on-surface-variant">${l(`verified_user`,`text-[18px] text-primary`)}<span class="font-label-compact text-label-compact">Hash chain checked on every load. The database rejects UPDATE and DELETE on events.</span></div>
<nav aria-label="Audit pages" class="flex items-center gap-space-xs">
${d>0?s`<a class="h-8 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high font-label-default text-label-default flex items-center" href="${E(`oversight`,void 0,{...Object.fromEntries(a),page:String(d-1)})}">Newer</a>`:``}
${(d+1)*25<t.total?s`<a class="h-8 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high font-label-default text-label-default flex items-center" href="${E(`oversight`,void 0,{...Object.fromEntries(a),page:String(d+1)})}">Older</a>`:``}
</nav></div></section>`}function me(e,t){return`$${e.toFixed(6)} · ₹${(e*t).toFixed(4)}`}function M(e,t){return s`<section id="ai-governance" aria-labelledby="gov-title" class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">
<div><div class="flex items-center gap-space-xs flex-wrap">${l(`smart_toy`,`text-primary text-[20px]`)}<h2 id="gov-title" class="font-headline-md text-headline-md text-on-surface">AI Agent Governance</h2>
<span class="px-space-sm py-0.5 rounded-full ${e.enabled?`bg-secondary-container text-on-secondary-fixed`:`bg-surface-container-high text-on-surface-variant`} font-label-compact text-label-compact font-semibold">${e.enabled?`AI drafting on`:`AI drafting disabled`}</span>
${e.simulated_mode?s`<span class="px-space-sm py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-compact text-label-compact font-semibold">Simulated provider where no key</span>`:``}</div>
<p class="font-body-compact text-body-compact text-on-surface-variant">What every call costs, which model served it, and who changed what. ${ge(e)}</p></div>
<div class="font-label-compact text-label-compact text-on-surface-variant">Keys: Gemini ${e.keys.gemini?`set`:`not set`} · Anthropic ${e.keys.anthropic?`set`:`not set`} · FX ₹${e.usd_inr_rate}/USD (placeholder)</div>
</div>
${_e(e)}
<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-md">${e.agents.map(t=>he(t,e))}</div>
${ye(t,e.usd_inr_rate)}
<details class="bg-surface-container-low rounded-lg p-space-sm"><summary class="font-label-default text-label-default cursor-pointer">Model price table (USD per 1M tokens)</summary>
<table class="w-full mt-space-sm font-body-compact text-body-compact"><caption class="sr-only">Model prices</caption><thead><tr class="text-left text-on-surface-variant"><th scope="col" class="py-1">Provider</th><th scope="col">Model</th><th scope="col" class="text-right">Input</th><th scope="col" class="text-right">Output</th><th scope="col" class="pl-space-md">Source</th></tr></thead>
<tbody>${e.prices.map(e=>s`<tr><td class="py-0.5">${e.provider}</td><td class="font-tabular-data">${e.model}</td><td class="text-right font-tabular-data">$${e.input.toFixed(2)}</td><td class="text-right font-tabular-data">$${e.output.toFixed(2)}</td><td class="pl-space-md text-on-surface-variant">${e.source} (${e.as_of})</td></tr>`)}</tbody></table>
</details>
</section>`}function he(e,t){let n=e.config,r=e.last_change,i=new Set(t.editable_fields??[]),a=e=>c(i.has(e)?``:`disabled`),o=i.has(`prompt`),l=(e,t,n)=>s`<select name="${e}" ${a(e)} class="h-8 px-space-xs rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact w-full">${t.map(e=>s`<option value="${e}" ${e===n?c(`selected`):``}>${e}</option>`)}</select>`;return s`<article id="agent-${e.agent_key}" class="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-sm" aria-labelledby="h-${e.agent_key}">
<div class="flex items-start justify-between gap-space-sm">
<div><h3 id="h-${e.agent_key}" class="font-headline-sm text-headline-sm">${e.display_name} <span class="font-label-compact text-label-compact text-on-surface-variant">v${e.version}</span></h3>
<p class="font-body-compact text-body-compact text-on-surface-variant">${e.description}</p></div>
<span class="px-space-sm py-0.5 rounded-full font-label-compact text-label-compact font-bold uppercase ${n.enabled?`bg-secondary-container text-on-secondary-fixed`:`bg-error-container text-on-error-container`}">${n.enabled?`On`:`Off`}</span>
</div>
<dl class="grid grid-cols-2 md:grid-cols-4 gap-space-xs font-body-compact text-body-compact">
${N(`LLM cost / task`,`$${e.llm_cost_usd_per_task.toFixed(6)}`,`₹${e.llm_cost_inr_per_task.toFixed(4)}`)}
${N(`Tasks (ok / all)`,`${e.tasks_ok} / ${e.tasks_total}`,`fallback ${e.fallback_share_pct}%`)}
${N(`Month spend`,`$${e.month_spend_usd.toFixed(4)}`,`of $${n.monthly_budget_usd.toFixed(2)} budget`)}
${N(`Charges`,`₹${e.task_based_charge_inr.toFixed(2)} task`,`₹${e.outcome_based_charge_inr.toFixed(2)} outcome (${e.outcomes_accepted})`)}
</dl>
<div class="font-label-compact text-label-compact text-on-surface-variant">Served by: ${Object.entries(e.served_by).map(([e,t])=>`${e} ×${t}`).join(` · `)||`no calls yet`}${e.circuit.primary_open?` · PRIMARY CIRCUIT OPEN (skipping to fallback)`:``}</div>
${r?s`<div class="p-space-sm rounded bg-surface-container-lowest font-body-compact text-body-compact"><strong>Last change v${r.version}</strong> by ${r.by}, ${x(r.at)}: ${r.note} <span class="text-on-surface-variant">(${r.fields.join(`, `)})</span><br/>
<span class="text-primary font-semibold">Effective immediately: the next call reads this version. No deploy or restart.</span>
${r.version>1&&r.first_call_at?s`<br/><span class="text-on-surface-variant">First call on v${r.version}: ${x(r.first_call_at)} (${ve(r.seconds_to_first_call??0)} after the change, i.e. the next request).</span>`:r.version>1?s`<br/><span class="text-on-surface-variant">No call on v${r.version} yet.</span>`:``}</div>`:``}
<form data-agent="${e.agent_key}" class="flex flex-col gap-space-sm" aria-label="Configure ${e.display_name}">
<fieldset class="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
<legend class="sr-only">Model routing</legend>
<label class="flex items-center gap-space-xs font-label-default text-label-default"><input type="checkbox" name="enabled" ${a(`enabled`)} ${n.enabled?c(`checked`):``} class="w-4 h-4 accent-primary"/> Agent enabled</label>
<label class="flex items-center gap-space-xs font-label-default text-label-default"><input type="checkbox" name="simulate_primary_outage" ${a(`simulate_primary_outage`)} ${n.simulate_primary_outage?c(`checked`):``} class="w-4 h-4 accent-primary"/> Drill: simulate primary outage</label>
<div class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Primary provider / model</span><div class="grid grid-cols-2 gap-1">${l(`primary_provider`,Object.keys(t.catalogue),n.primary_provider)}${l(`primary_model`,t.catalogue[n.primary_provider]??[],n.primary_model)}</div></div>
<div class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Fallback provider / model</span><div class="grid grid-cols-2 gap-1">${l(`fallback_provider`,Object.keys(t.catalogue),n.fallback_provider)}${l(`fallback_model`,t.catalogue[n.fallback_provider]??[],n.fallback_model)}</div></div>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Default tone</span>${l(`tone`,t.tones,n.tone)}</label>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Timeout (seconds)</span><input name="timeout_seconds" ${a(`timeout_seconds`)} type="number" min="3" max="60" value="${n.timeout_seconds}" class="h-8 px-space-xs rounded bg-surface-container-lowest"/></label>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Task price (₹ per successful task)</span><input name="task_price_inr" ${a(`task_price_inr`)} type="number" step="0.01" min="0" value="${n.task_price_inr}" class="h-8 px-space-xs rounded bg-surface-container-lowest"/></label>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Outcome price (₹ when sent)</span><input name="outcome_price_inr" ${a(`outcome_price_inr`)} type="number" step="0.01" min="0" value="${n.outcome_price_inr}" class="h-8 px-space-xs rounded bg-surface-container-lowest"/></label>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Monthly budget (USD)</span><input name="monthly_budget_usd" ${a(`monthly_budget_usd`)} type="number" step="0.01" min="0" value="${n.monthly_budget_usd}" class="h-8 px-space-xs rounded bg-surface-container-lowest"/></label>
<label class="flex flex-col gap-1 md:col-span-2"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Prompt ({tone} is replaced; fixed guardrails are always appended and cannot be edited)</span><textarea name="prompt" ${a(`prompt`)} rows="6" minlength="50" maxlength="4000" class="p-space-xs rounded bg-surface-container-lowest font-body-compact text-body-compact">${n.prompt}</textarea></label>
${t.can_edit?s`<label class="flex flex-col gap-1 md:col-span-2"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Reason for change (required, recorded)</span><input name="note" required minlength="3" maxlength="500" class="h-8 px-space-xs rounded bg-surface-container-lowest" placeholder="e.g. Cost review: switch primary to Flash-Lite"/></label>`:``}
</fieldset>
<p class="form-error hidden text-error font-label-default text-label-default" role="alert"></p>
${t.can_edit?s`<div class="flex justify-end"><button type="submit" class="h-8 px-space-md rounded bg-primary text-on-primary hover:bg-primary-container font-label-default text-label-default">Save as v${e.version+1}</button></div>`:``}
</form>
<details><summary class="font-label-default text-label-default cursor-pointer">Version history (${e.versions.length})</summary>
<ol class="mt-space-xs flex flex-col gap-space-xs font-body-compact text-body-compact">${e.versions.map(t=>s`<li class="p-space-xs rounded bg-surface-container-lowest flex flex-col gap-1">
<div class="flex items-center justify-between gap-space-xs flex-wrap"><span><strong>v${t.version}</strong> · ${x(t.at)} · ${t.by}: ${t.note} <span class="text-on-surface-variant">(${t.fields.join(`, `)})</span></span>
${o&&t.version!==e.version?s`<button type="button" data-restore="${e.agent_key}:${t.version}" class="h-7 px-space-sm rounded bg-surface-container-high hover:bg-primary-container hover:text-on-primary font-label-compact text-label-compact">Restore v${t.version}</button>`:``}</div>
<span class="font-label-compact text-label-compact text-on-surface-variant">${t.primary??``} → fallback ${t.fallback??``} · tone ${t.tone??``}</span>
${t.prompt?s`<details><summary class="font-label-compact text-label-compact text-primary cursor-pointer">Prompt in v${t.version}</summary><pre class="whitespace-pre-wrap p-space-xs rounded bg-surface-container-low">${t.prompt}</pre></details>`:``}
</li>`)}</ol></details>
</article>`}function ge(e){let t=new Set(e.editable_fields??[]);return t.has(`prompt`)?`As AI Agent Owner you change prompts, tone, models, fallback and timeout. Business controls (on/off, budget, prices) belong to the Credit Manager.`:t.has(`enabled`)?`As Credit Manager you control on/off, budgets and prices. Prompts and models belong to the AI Agent Owner.`:`Read-only for your role.`}function _e(e){let t=e.totals;if(!t)return s``;let n=(e,t)=>s`<tr class="border-t border-surface-container-high">
<th scope="row" class="py-1 pr-space-sm text-left font-medium">${e}</th>
<td class="text-right font-tabular-data">${t.tasks}</td><td class="text-right font-tabular-data">${t.calls}</td>
<td class="text-right font-tabular-data">${t.tokens.toLocaleString(`en-IN`)}</td>
<td class="text-right font-tabular-data font-semibold">$${t.llm_cost_usd.toFixed(6)}</td>
<td class="text-right font-tabular-data">₹${t.llm_cost_inr.toFixed(4)}</td>
<td class="text-right font-tabular-data">$${t.real_llm_cost_usd.toFixed(6)}</td>
<td class="text-right font-tabular-data">₹${t.task_based_inr.toFixed(2)}</td>
<td class="text-right font-tabular-data">₹${t.outcome_based_inr.toFixed(2)}</td></tr>`;return s`<div class="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-sm">
<div class="flex items-center justify-between flex-wrap gap-space-xs"><h3 class="font-headline-sm text-headline-sm flex items-center gap-space-xs">${l(`payments`,`text-primary text-[20px]`)}Cost incurred until now</h3>
<span class="font-label-compact text-label-compact text-on-surface-variant">"Real" excludes simulated calls. FX ₹${e.usd_inr_rate}/USD (placeholder).</span></div>
<div class="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
${N(`All-time LLM cost`,`$${t.all_time.llm_cost_usd.toFixed(6)}`,`₹${t.all_time.llm_cost_inr.toFixed(4)} · ${t.all_time.calls} calls`)}
${N(`This month`,`$${t.this_month.llm_cost_usd.toFixed(6)}`,`${t.this_month.tasks} tasks`)}
${N(`Real (billed) cost`,`$${t.all_time.real_llm_cost_usd.toFixed(6)}`,`${t.all_time.simulated_calls} simulated calls excluded`)}
${N(`Task + outcome charges`,`₹${(t.all_time.task_based_inr+t.all_time.outcome_based_inr).toFixed(2)}`,`₹${t.all_time.task_based_inr.toFixed(2)} task · ₹${t.all_time.outcome_based_inr.toFixed(2)} outcome`)}
</div>
<div class="overflow-x-auto"><table class="w-full font-body-compact text-body-compact" style="min-width:760px"><caption class="sr-only">Cost by agent and model</caption>
<thead><tr class="text-on-surface-variant font-label-compact text-label-compact uppercase"><th scope="col" class="text-left py-1">Breakdown</th><th scope="col" class="text-right">Tasks</th><th scope="col" class="text-right">Calls</th><th scope="col" class="text-right">Tokens</th><th scope="col" class="text-right">LLM USD</th><th scope="col" class="text-right">LLM INR</th><th scope="col" class="text-right">Real USD</th><th scope="col" class="text-right">Task ₹</th><th scope="col" class="text-right">Outcome ₹</th></tr></thead>
<tbody>${Object.entries(t.by_agent).map(([e,t])=>n(e===`reminder_rewriter`?`Agent: Rewriter`:`Agent: Critic`,t))}
${Object.entries(t.by_model).map(([e,t])=>n(`Model: ${e}`,t))}</tbody></table></div>
</div>`}function ve(e){return e<90?`${Math.round(e)} s`:e<5400?`${Math.round(e/60)} min`:e<172800?`${(e/3600).toFixed(1)} h`:`${Math.round(e/86400)} days`}function N(e,t,n){return s`<div class="p-space-xs rounded bg-surface-container-lowest"><dt class="font-label-compact text-label-compact uppercase text-on-surface-variant">${e}</dt><dd class="font-tabular-data text-tabular-data font-semibold">${t}</dd><dd class="font-label-compact text-label-compact text-on-surface-variant">${n}</dd></div>`}function ye(e,t){return s`<div><h3 class="font-headline-sm text-headline-sm mb-space-xs">Cost ledger: every agent task and its calls</h3>
<p class="font-body-compact text-body-compact text-on-surface-variant mb-space-sm">One row per task. "Calls" lists each model attempt (primary, then fallback) with its own tokens and cost; the task cost is their sum.</p>
<div class="overflow-x-auto rounded-lg"><table class="w-full text-left border-collapse" style="min-width:1100px">
<caption class="sr-only">AI agent tasks with cost per call</caption>
<thead><tr class="bg-surface-container-high/60 text-on-surface-variant font-label-compact text-label-compact uppercase tracking-wider h-8">
<th scope="col" class="px-2">Time</th><th scope="col" class="px-2">Agent / task</th><th scope="col" class="px-2">App</th><th scope="col" class="px-2">By</th><th scope="col" class="px-2">Calls (route · model · status · tokens · cost · latency)</th><th scope="col" class="px-2 text-right">LLM cost</th><th scope="col" class="px-2 text-right">Task ₹</th><th scope="col" class="px-2">Outcome</th><th scope="col" class="px-2">Status</th>
</tr></thead>
<tbody class="divide-y divide-surface-container-high font-body-compact text-body-compact">
${e.length?e.map(e=>s`<tr class="align-top">
<td class="px-2 py-1.5 whitespace-nowrap font-tabular-data">${x(e.created_at)}</td>
<td class="px-2 py-1.5">${e.agent_key===`reminder_rewriter`?`Rewriter`:`Critic`} · ${e.task}${e.tone?` (${e.tone})`:``}<br/><span class="text-on-surface-variant font-label-compact text-label-compact">config v${e.config_version}</span></td>
<td class="px-2 py-1.5 font-tabular-data text-primary">${e.application_id??`—`}</td>
<td class="px-2 py-1.5">${e.triggered_by}</td>
<td class="px-2 py-1.5"><ol class="flex flex-col gap-0.5">${e.attempts.map(e=>s`<li class="font-label-compact text-label-compact"><span class="font-semibold">${e.route}</span> · ${e.provider}/${e.model} · <span class="${e.status===`ok`?`text-primary`:`text-error`} font-semibold">${e.status}</span>${e.error?` (${e.error})`:``} · ${e.input_tokens}+${e.output_tokens} tok · $${e.cost_usd.toFixed(6)} · ${e.latency_ms}ms${e.simulated?` · simulated`:``}</li>`)}</ol></td>
<td class="px-2 py-1.5 text-right font-tabular-data whitespace-nowrap">${me(e.llm_cost_usd,t)}</td>
<td class="px-2 py-1.5 text-right font-tabular-data">₹${e.task_price_inr.toFixed(2)}</td>
<td class="px-2 py-1.5">${e.outcome===`accepted`?s`<span class="text-primary font-semibold">Accepted · ₹${e.outcome_price_inr.toFixed(2)}</span>`:e.outcome}</td>
<td class="px-2 py-1.5"><span class="px-2 py-0.5 rounded-full font-label-compact text-label-compact font-bold uppercase ${e.status===`ok`?`bg-secondary-container text-on-secondary-fixed`:`bg-error-container text-on-error-container`}">${e.status===`ok`?e.used_fallback?`OK · fallback`:`OK`:`Failed`}</span></td>
</tr>`):s`<tr><td colspan="9" class="p-space-md text-center text-on-surface-variant">No agent calls yet.</td></tr>`}
</tbody></table></div></div>`}var P=null;async function F(t,r){let[i,a,o,s]=await Promise.all([n.get(`/api/agents`),n.get(`/api/agent-runs?limit=25`),n.get(`/api/agent-traces?limit=15`),u()]);t.root.innerHTML=xe(t,i,a,o,s).value;let c=()=>F(t,r);k(t,i,c),be(t);let l=t.root.querySelector(`#wb-agent`),d=t.root.querySelector(`#wb-prompt`);l&&d&&(l.addEventListener(`change`,()=>{let e=i.agents.find(e=>e.agent_key===l.value);e&&(d.value=e.config.prompt)}),t.root.querySelector(`#wb-reset`)?.addEventListener(`click`,()=>{let e=i.agents.find(e=>e.agent_key===l.value);e&&(d.value=e.config.prompt)}),t.root.querySelector(`#wb-run`)?.addEventListener(`click`,async r=>{let i=r.currentTarget;i.disabled=!0,i.textContent=`Running…`;try{P=await n.post(`/api/agents/${l.value}/test`,{prompt:d.value,tone:t.root.querySelector(`#wb-tone`).value}),t.toast(P.status===`ok`?`Done · $${P.trace?.total_cost_usd.toFixed(6)}`:`Failed: ${P.error}`)}catch(n){t.toast(n instanceof e?n.message:`Run failed`)}let a=l.value,o=d.value;await c(),t.root.querySelector(`#wb-agent`).value=a,t.root.querySelector(`#wb-prompt`).value=o,document.getElementById(`wb-result`)?.scrollIntoView({block:`start`})}),t.root.querySelector(`#wb-save`)?.addEventListener(`click`,async()=>{let r=t.root.querySelector(`#wb-note`).value.trim(),i=t.root.querySelector(`#wb-error`);if(r.length<3)i.textContent=`Add a reason for the change (recorded with the new version).`,i.classList.remove(`hidden`);else try{await n.patch(`/api/agents/${l.value}`,{prompt:d.value,tone:t.root.querySelector(`#wb-tone`).value,note:r}),t.toast(`Prompt saved as a new version. Live on the next call.`),await c()}catch(t){i.textContent=t instanceof e?t.message:`Could not save`,i.classList.remove(`hidden`)}}))}function be(e){e.root.querySelectorAll(`[data-trace]`).forEach(e=>e.addEventListener(`click`,async()=>{let t=document.getElementById(`trace-${e.dataset.trace}`);if(t.innerHTML){t.innerHTML=``;return}let r=await n.get(`/api/agent-traces/${e.dataset.trace}`);t.innerHTML=T(r,r.kind===`pipeline`?`Document-chase agent run`:`Agent task`).value}))}function xe(e,t,n,r,i){let a=t.agents.find(e=>e.agent_key===`reminder_rewriter`)??t.agents[0],o=t.can_test,u=P;return s`<section class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mb-space-lg">
<div class="flex flex-col gap-0.5">
<div class="flex items-center gap-space-xs text-on-surface-variant font-label-compact text-label-compact uppercase tracking-wider">${l(`smart_toy`,`text-[16px] text-primary`)}<span>${e.session.user.role_label}</span><span class="text-outline-variant" aria-hidden="true">/</span><span>${o?`Separate login`:`Read-only`}</span></div>
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">${o?`AI Agent Workbench`:`AI Cost & Governance`}</h1>
<p class="font-body-compact text-body-compact text-on-surface-variant">${o?`Run an agent on an input, see every security check, prompt, model call, fallback and cost, then save or roll back the prompt.`:`What the AI agents have cost so far, which models served each call, and every configuration change. Read-only.`} Signed in as ${e.session.user.name}. This role sees no client files and no audit log.</p>
</div>
<div class="flex items-center gap-space-sm flex-wrap font-label-compact text-label-compact">
<span class="px-space-sm py-1 rounded-full ${t.enabled?`bg-secondary-container text-on-secondary-fixed`:`bg-error-container text-on-error-container`} font-semibold">${t.enabled?`AI agents on`:`AI disabled (FEATURE_AI_DRAFTING=false)`}</span>
<span class="px-space-sm py-1 rounded-full bg-surface-container-high">Gemini key: ${t.keys.gemini?`set`:`not set`}</span>
<span class="px-space-sm py-1 rounded-full bg-surface-container-high">Anthropic key: ${t.keys.anthropic?`set`:`not set`}</span>
${t.simulated_mode?s`<span class="px-space-sm py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-semibold">Missing keys → simulator</span>`:``}
</div></section>

${o?s`<section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md mb-space-xl" aria-labelledby="wb-title">
<h2 id="wb-title" class="font-headline-md text-headline-md flex items-center gap-space-xs">${l(`play_circle`,`text-primary text-[22px]`)}Run an input</h2>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
<div class="flex flex-col gap-space-sm">
<div class="grid grid-cols-2 gap-space-sm">
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Agent</span>
<select id="wb-agent" class="h-8 px-space-xs rounded bg-surface-container-low">${t.agents.map(e=>s`<option value="${e.agent_key}" ${e.agent_key===a.agent_key?c(`selected`):``}>${e.display_name} (v${e.version})</option>`)}</select></label>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Tone</span>
<select id="wb-tone" class="h-8 px-space-xs rounded bg-surface-container-low">${t.tones.map(e=>s`<option value="${e}" ${e===a.config.tone?c(`selected`):``}>${e}</option>`)}</select></label>
</div>
<label class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Prompt (editable; not saved until you click Save. {tone} is replaced; guardrails are appended by the server)</span>
<textarea id="wb-prompt" rows="8" class="p-space-sm rounded bg-surface-container-low font-body-compact text-body-compact">${a.config.prompt}</textarea></label>
<div class="flex flex-wrap gap-space-sm items-center">
<button type="button" id="wb-run" ${o?``:c(`disabled`)} class="h-9 px-space-md rounded bg-primary text-on-primary hover:bg-primary-container font-label-default text-label-default flex items-center gap-1.5 disabled:opacity-50">${l(`play_arrow`)} Run with this prompt</button>
<button type="button" id="wb-reset" class="h-9 px-space-md rounded bg-surface-container-high font-label-default text-label-default">Reset to live prompt</button>
</div>
<div class="flex flex-col gap-1 p-space-sm rounded-lg bg-surface-container-low">
<label for="wb-note" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Reason for change (recorded)</label>
<div class="flex gap-space-xs"><input id="wb-note" class="flex-1 h-8 px-space-xs rounded bg-surface-container-lowest" placeholder="e.g. Shorter, friendlier wording after test"/>
<button type="button" id="wb-save" ${t.editable_fields.includes(`prompt`)?``:c(`disabled`)} class="h-8 px-space-md rounded bg-primary-container text-on-primary font-label-default text-label-default disabled:opacity-50">Save prompt + tone as new version</button></div>
<p id="wb-error" role="alert" class="hidden text-error font-label-default text-label-default"></p>
</div>
</div>
<div class="flex flex-col gap-space-sm">
<span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Input (synthetic sample reminder; names are placeholders)</span>
<pre class="p-space-sm rounded bg-surface-container-low whitespace-pre-wrap font-body-compact text-body-compact">${u?.input??`Dear [[CONTACT]],

Regarding your application KF-2026-0000 for [[CLIENT]]:

To continue with your application, we need the following documents:

1. Current account statement (last 12 months)
2. GSTR-3B returns (last 6 months)

Please share these documents by Friday, 20 Nov 2026.

If you have any questions, please contact your Relationship Manager, Sample RM.

Kestrel Finance, SME Lending`}</pre>
${u?s`<span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Output</span>
<pre class="p-space-sm rounded ${u.status===`ok`?`bg-secondary-container/40`:`bg-error-container/40`} whitespace-pre-wrap font-body-compact text-body-compact">${u.output??u.error??``}</pre>`:s`<p class="font-body-compact text-body-compact text-on-surface-variant">Run the agent to see its output and the full trace here.</p>`}
</div></div>
<div id="wb-result">${u?.trace?T(u.trace,`Trace of this run`):``}</div>
</section>`:s``}

${M(t,n)}

<section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm mt-space-xl" aria-labelledby="tr-title">
<h2 id="tr-title" class="font-headline-md text-headline-md flex items-center gap-space-xs">${l(`account_tree`,`text-primary text-[22px]`)}Recent agent traces</h2>
<p class="font-body-compact text-body-compact text-on-surface-variant">Every agent task and every document-chase run is traced step by step. Open one to see the checks, prompts, model calls and costs.</p>
<ul class="flex flex-col gap-space-xs">
${r.length?r.map(e=>s`<li class="rounded-lg bg-surface-container-low p-space-sm flex flex-col gap-space-xs">
<div class="flex items-center justify-between gap-space-sm flex-wrap">
<span class="font-body-compact text-body-compact"><strong>${e.kind===`pipeline`?`Document-chase agent`:e.agent_key===`reminder_critic`?`Critic task`:`Rewriter task`}</strong> · ${x(e.created_at)} · ${e.triggered_by} · ${e.application_id??`synthetic sample`} · ${e.steps_count??e.steps.length} steps</span>
<span class="flex items-center gap-space-sm"><span class="font-tabular-data text-tabular-data text-primary">$${e.total_cost_usd.toFixed(6)}</span>
<span class="px-2 py-0.5 rounded-full font-label-compact text-label-compact font-bold uppercase ${e.status===`ok`?`bg-secondary-container text-on-secondary-fixed`:`bg-error-container text-on-error-container`}">${e.status}</span>
<button type="button" data-trace="${e.task_id}" class="h-7 px-space-sm rounded bg-surface-container-high font-label-compact text-label-compact">View trace</button></span></div>
<div id="trace-${e.task_id}"></div></li>`):s`<li class="text-on-surface-variant">No traces yet.</li>`}
</ul></section>

<section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm mt-space-xl" aria-labelledby="rbac-title">
<h2 id="rbac-title" class="font-headline-md text-headline-md flex items-center gap-space-xs">${l(`admin_panel_settings`,`text-primary text-[22px]`)}Role-based access control</h2>
${d(i)}
</section>`}async function I(t,r){let i=await n.get(`/api/analyst/files`),a=r.id??i[0]?.id;if(!a){t.root.innerHTML=s`<p class="p-space-lg">No files are assigned to you.</p>`.value;return}if(!r.id){window.location.replace(E(`analyst`,a));return}let o=await n.get(`/api/analyst/files/${encodeURIComponent(a)}`);t.root.innerHTML=Se(o,i,t.session.user.name).value;let c=t.root.querySelector(`#req-form`);t.root.querySelectorAll(`[data-select]`).forEach(e=>e.addEventListener(`click`,()=>{let n=t.root.querySelector(`input[name="item"][value="${e.dataset.select}"]`);n&&(n.checked=!0),t.root.querySelector(`#rm-note-input`)?.focus()})),t.root.querySelector(`#btn-request-rm`)?.addEventListener(`click`,()=>t.root.querySelector(`#rm-note-input`)?.focus()),c?.addEventListener(`submit`,async i=>{i.preventDefault();let a=[...c.querySelectorAll(`input[name="item"]:checked`)].map(e=>Number(e.value)),s=c.querySelector(`#rm-note-input`).value.trim(),l=t.root.querySelector(`#requisition-feedback`);if(!a.length||!s)l.textContent=`Select at least one blocking document and add a note.`,l.classList.remove(`hidden`);else try{let e=await n.post(`/api/analyst/files/${o.id}/request-from-rm`,{item_ids:a,note:s});t.toast(`Request logged and added to ${e.rm}'s queue`),await I(t,r)}catch(t){l.textContent=t instanceof e?t.message:`Could not send the request`,l.classList.remove(`hidden`)}}),t.root.querySelector(`#file-picker`)?.addEventListener(`change`,e=>t.go(E(`analyst`,e.target.value)))}function Se(e,t,n){let r=e.readiness===`blocked`,i=t.find(t=>t.id!==e.id&&t.status===`complete`);return s`<div class="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div class="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm bg-surface-container-low px-space-md py-space-xs rounded-lg">
<div class="flex items-center gap-space-sm font-label-compact text-label-compact text-on-surface-variant flex-wrap">
<span class="font-semibold text-primary">CREDIT ANALYSIS DESK</span><span class="text-outline-variant" aria-hidden="true">/</span>
<span>Analyst: <strong class="text-on-surface">${n}</strong></span><span class="text-outline-variant" aria-hidden="true">/</span>
<label for="file-picker" class="sr-only">Switch file</label>
<select id="file-picker" class="h-7 px-space-xs rounded bg-surface-container-lowest text-on-surface font-label-compact text-label-compact">
${t.map(t=>s`<option value="${t.id}" ${t.id===e.id?c(`selected`):``}>${t.id} · ${t.status===`complete`?`Complete`:`Blocked`}</option>`)}
</select></div>
${i?s`<div class="flex items-center gap-space-xs text-on-surface-variant font-label-compact text-label-compact"><span class="w-2 h-2 rounded-full bg-secondary" aria-hidden="true"></span><span><a class="text-on-surface font-semibold hover:underline" href="${E(`analyst`,i.id)}">${i.id}</a> is complete and ready for analysis</span></div>`:``}
</div>
<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
<div class="flex flex-col gap-space-xs">
<div class="flex flex-wrap items-center gap-space-sm">
<h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">File ${e.id}: ${e.client_name}</h1>
${r?s`<span class="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-error-container text-on-error-container font-label-default text-label-default">${l(`error`,`text-[16px] text-error`)}STATUS: BLOCKED (${e.outstanding_count} Outstanding ${e.outstanding_count===1?`Document`:`Documents`})</span>`:s`<span class="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-fixed font-label-default text-label-default">${l(`task_alt`,`text-[16px] text-primary`)}STATUS: COMPLETE · Ready for analysis</span>`}
</div>
<p class="font-body-compact text-body-compact text-on-surface-variant flex items-center gap-space-xs">${r?s`${l(`block`,`text-error text-[16px]`)}<span><strong class="text-on-surface">On hold:</strong> the items below must be received or waived before this file is complete.</span>`:s`${l(`verified`,`text-primary text-[16px]`)}<span>Every checklist item is received or waived. No action needed from the RM.</span>`}</p>
</div>
<div class="flex items-center flex-wrap gap-space-sm">
<a class="h-8 px-space-md rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-default text-label-default flex items-center gap-1.5 transition-colors" href="${E(`checklist`,e.id)}">${l(`checklist`)}<span>Jump to Application Checklist</span></a>
${r?s`<button type="button" id="btn-request-rm" class="h-8 px-space-md rounded bg-primary-container text-on-primary font-label-default text-label-default flex items-center gap-1.5 hover:bg-primary transition-colors shadow-sm">${l(`assignment_turned_in`)}<span>Request from RM</span></button>`:``}
</div></div>
<div class="grid grid-cols-2 md:grid-cols-4 gap-space-sm pt-space-xs">
${L(`APPLICANT TYPE`,e.applicant_type)}
${L(`ASSIGNED RM`,e.rm.name)}
${L(`DOCUMENTS`,`${e.items_done} / ${e.items_total} received or waived`)}
${L(`OPENED`,`${_(e.opened_on)} (${e.age_days} days)`)}
</div></div>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter mt-space-md">
<div class="lg:col-span-7 flex flex-col gap-space-md">
${r?s`<div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
<div class="bg-error-container/30 px-space-lg py-space-sm flex items-center justify-between">
<div class="flex items-center gap-space-xs">${l(`report_problem`,`text-error text-[18px]`)}<h2 class="font-headline-sm text-headline-sm text-on-surface">Blocking Items (${e.blocking.length})</h2></div>
<span class="px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-label-compact text-label-compact">FILE NOT COMPLETE</span>
</div>
<div class="p-space-lg flex flex-col gap-space-md">
<p class="font-body-compact text-body-compact text-on-surface-variant">These documents have not been received. The client is contacted only by the RM, after RM approval.</p>
${e.blocking.map(e=>s`<div class="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
<div class="flex items-start justify-between gap-space-sm">
<div class="flex items-center gap-space-sm">
<div class="w-7 h-7 rounded ${e.status===`overdue`?`bg-error/10 text-error`:`bg-secondary-container text-on-secondary-fixed`} flex items-center justify-center shrink-0">${l(e.status===`overdue`?`close`:`hourglass_top`,`text-[18px]`)}</div>
<div><h3 class="font-label-default text-label-default text-on-surface font-semibold">${e.name}</h3>
<div class="flex flex-wrap items-center gap-space-xs text-on-surface-variant font-label-compact text-label-compact">
<span>${e.category}</span><span aria-hidden="true">•</span><span>Owner: <strong class="text-on-surface">${e.owner}</strong></span><span aria-hidden="true">•</span>
<span class="${e.status===`overdue`?`text-error`:`text-tertiary`} font-medium">Requested ${_(e.requested_on)} · ${e.status===`overdue`?`${e.days_past_due}d overdue`:e.status===`due_today`?`due today`:`due ${_(e.due_date)}`}</span>
${e.analyst_request_id?s`<span class="px-space-xs rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-bold">Already requested from RM</span>`:``}
</div></div></div>
<button type="button" data-select="${e.id}" class="h-7 px-space-sm rounded bg-surface-container-highest hover:bg-primary-container hover:text-on-primary text-on-surface font-label-compact text-label-compact flex items-center gap-1 transition-colors shrink-0">${l(`forward`,`text-[14px]`)}<span>Select for Request</span></button>
</div></div>`)}
</div></div>`:``}
<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
<div class="flex items-center justify-between">
<div class="flex items-center gap-space-xs">${l(`check_circle`,`text-primary text-[20px]`)}<h2 class="font-headline-sm text-headline-sm text-on-surface">Received &amp; Waived Documents (${e.received_items.length})</h2></div>
</div>
<div class="flex flex-col gap-space-sm">
${e.received_items.map(e=>s`<div class="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-space-md">
<div class="flex items-center gap-space-sm min-w-0">${l(e.status===`waived`?`do_not_disturb_on`:`verified`,`${e.status===`waived`?`text-on-surface-variant`:`text-primary`} text-[18px]`)}
<div class="min-w-0"><p class="font-label-default text-label-default text-on-surface font-semibold truncate">${e.name}</p>
<p class="font-label-compact text-label-compact text-on-surface-variant truncate">${e.status===`waived`?`Waived by ${e.waived_by}: ${e.waived_reason}`:`Received ${e.received_at?x(e.received_at):``} · confirmed by ${e.received_by}`}</p></div></div>
<span class="px-space-sm py-0.5 rounded bg-surface-container text-on-surface font-label-compact text-label-compact shrink-0">${e.status_label}</span>
</div>`)}
</div></div></div>

<div class="lg:col-span-5 flex flex-col gap-space-md">
${r?s`<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
<div class="flex items-center justify-between"><div class="flex items-center gap-space-xs">${l(`outgoing_mail`,`text-primary text-[20px]`)}<h2 class="font-headline-sm text-headline-sm text-on-surface">Request to Relationship Manager</h2></div>
<span class="px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-compact text-label-compact">Desk-to-Desk Link</span></div>
<p class="font-body-compact text-body-compact text-on-surface-variant">Sends a linked request to <strong>RM ${e.rm.name}</strong>. The client is <em>not</em> contacted automatically; only the RM can approve client reminders.</p>
<form id="req-form" class="flex flex-col gap-space-sm">
<fieldset class="flex flex-col gap-space-xs"><legend class="font-label-compact text-label-compact text-on-surface-variant uppercase tracking-wider mb-1">Blocking documents</legend>
${e.blocking.map(e=>s`<label class="flex items-center gap-space-xs font-body-compact text-body-compact"><input type="checkbox" name="item" value="${e.id}" class="w-4 h-4 accent-primary"/> ${e.name}</label>`)}
</fieldset>
<label for="rm-note-input" class="font-label-compact text-label-compact text-on-surface-variant uppercase tracking-wider mt-1">Note to RM</label>
<textarea class="p-space-sm rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact placeholder:text-on-surface-variant" id="rm-note-input" placeholder="State the specific requirement for the RM..." rows="3" maxlength="1000"></textarea>
<div class="flex items-center justify-between pt-space-xs flex-wrap gap-space-xs">
<span class="font-label-compact text-label-compact text-on-surface-variant">Assignee: ${e.rm.name}</span>
<button type="submit" class="h-8 px-space-md rounded bg-primary text-on-primary font-label-default text-label-default flex items-center gap-1.5 hover:bg-primary-container transition-colors shadow-sm">${l(`send`)}<span>Send Request to RM ${e.rm.name}</span></button>
</div>
<p id="requisition-feedback" role="alert" class="hidden p-space-sm rounded bg-error-container text-on-error-container font-label-compact text-label-compact"></p>
</form>
${e.analyst_requests.length?s`<div class="flex flex-col gap-space-xs">${e.analyst_requests.map(e=>s`<div class="p-space-sm rounded bg-surface-container-low font-body-compact text-body-compact"><strong>Sent ${x(e.created_at)}</strong> by ${e.analyst}: ${e.note}</div>`)}</div>`:``}
</div>`:``}
<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
<div class="flex items-center justify-between"><div class="flex items-center gap-space-xs">${l(`history_edu`,`text-on-surface-variant text-[20px]`)}<h2 class="font-headline-sm text-headline-sm text-on-surface">Document Receipt Log</h2></div>
<span class="font-label-compact text-label-compact text-on-surface-variant">Analyst Visibility Only</span></div>
<div class="p-space-xs rounded bg-surface-container text-on-surface-variant font-label-compact text-label-compact">No client-facing reminder text is shown here. Only requests, receipts, waivers and completion, from the event log.</div>
<ol class="relative pl-6 flex flex-col gap-space-md before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-highest">
${e.receipt_log.slice(0,12).map(e=>s`<li class="relative flex flex-col gap-0.5">
<span class="absolute -left-6 top-0.5 w-3 h-3 rounded-full ${e.event_type===`document_received`||e.event_type===`file_marked_complete`?`bg-primary`:`bg-outline-variant`} ring-4 ring-surface-container-lowest" aria-hidden="true"></span>
<div class="flex items-center justify-between gap-space-xs"><span class="font-label-default text-label-default text-on-surface font-semibold">${e.event_label}</span><span class="font-tabular-data text-tabular-data text-on-surface-variant">${x(e.occurred_at)}</span></div>
<p class="font-body-compact text-body-compact text-on-surface-variant">${e.reason} · ${e.actor_name}</p>
</li>`)}
</ol></div></div></div>`}function L(e,t){return s`<div class="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-0.5"><span class="font-label-compact text-label-compact text-on-surface-variant">${e}</span><span class="font-label-default text-label-default text-on-surface">${t}</span></div>`}var Ce={"Identity and Constitution":`shield_person`,"Bank Statements":`account_balance`,"GST Returns":`receipt_long`,"Financial Statements":`query_stats`,"Other Documents":`folder_special`};async function we(e){return e.session.user.role===`analyst`?(await n.get(`/api/analyst/files`))[0]?.id??null:(await n.get(`/api/queue`)).rows[0]?.id??null}async function R(e,t){if(!t.id){let t=await we(e);if(!t){e.root.innerHTML=s`<p class="p-space-lg">No applications in your view.</p>`.value;return}window.location.replace(E(`checklist`,t));return}let r=await n.get(`/api/applications/${encodeURIComponent(t.id)}`),i=t.params.get(`filter`)??`all`;e.root.innerHTML=Oe(r,i,e.session.user.role).value,Te(e,r,i)}function Te(t,r,i){let a=t.root,o=()=>R(t,{screen:`checklist`,id:r.id,params:new URLSearchParams({filter:i})});for(let e of a.querySelectorAll(`[data-filter]`))e.addEventListener(`click`,()=>t.go(E(`checklist`,r.id,e.dataset.filter===`all`?void 0:{filter:e.dataset.filter})));a.querySelector(`#history-toggle`)?.addEventListener(`click`,e=>{a.querySelectorAll(`[data-extra-event]`).forEach(e=>e.classList.remove(`hidden`)),e.currentTarget.remove()});let s=async i=>{try{await n.post(`/api/applications/${r.id}/reminders`,i?{item_ids:i}:{}),t.go(E(`composer`,r.id))}catch(n){t.toast(n instanceof e?n.message:`Could not create the draft`)}};a.querySelector(`#btn-request-all`)?.addEventListener(`click`,()=>void s()),a.addEventListener(`click`,async i=>{let a=i.target.closest(`button[data-action]`);if(!a)return;let c=Number(a.dataset.item),l=a.dataset.action;if(l===`draft`)return void s([c]);if(l===`receive`){a.disabled=!0;try{await n.post(`/api/applications/${r.id}/items/${c}/receive`),t.toast(`Marked received and logged`),await o()}catch(n){a.disabled=!1,t.toast(n instanceof e?n.message:`Could not mark received`)}}l===`waive`&&Ee(t,r,c,o)})}function Ee(t,r,i,a){let o=r.groups.flatMap(e=>e.items).find(e=>e.id===i),c=document.createElement(`dialog`);c.className=`rounded-xl p-0 max-w-lg w-full bg-surface-container-lowest text-on-surface shadow-xl`,c.setAttribute(`aria-labelledby`,`waive-title`),c.innerHTML=s`<form method="dialog" class="p-space-xl flex flex-col gap-space-md">
<h2 id="waive-title" class="font-headline-sm text-headline-sm">Waive item</h2>
<p class="font-body-compact text-body-compact text-on-surface-variant">${o.name}. A waiver needs a recorded reason; it is written to the immutable event log with your name.</p>
<label for="waive-reason" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Reason (required)</label>
<textarea id="waive-reason" required minlength="5" maxlength="500" rows="3" class="p-space-sm rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact"></textarea>
<p id="waive-error" role="alert" class="hidden text-error font-label-default text-label-default"></p>
<div class="flex justify-end gap-space-sm">
<button type="button" data-cancel class="h-8 px-space-md rounded bg-surface-container hover:bg-surface-container-high font-body-default text-body-default">Cancel</button>
<button type="submit" class="h-8 px-space-md rounded bg-primary text-on-primary hover:bg-primary-container font-body-default text-body-default font-semibold">Record waiver</button>
</div></form>`.value,document.body.append(c),c.addEventListener(`close`,()=>c.remove()),c.querySelector(`[data-cancel]`).addEventListener(`click`,()=>c.close()),c.querySelector(`form`).addEventListener(`submit`,async o=>{o.preventDefault();let s=c.querySelector(`#waive-reason`).value.trim(),l=c.querySelector(`#waive-error`);if(s.length<5)l.textContent=`Enter a reason of at least 5 characters.`,l.classList.remove(`hidden`);else try{await n.post(`/api/applications/${r.id}/items/${i}/waive`,{reason:s}),c.close(),t.toast(`Waiver recorded`),await a()}catch(t){l.textContent=t instanceof e?t.message:`Could not record the waiver`,l.classList.remove(`hidden`)}}),c.showModal()}function De(e,t){return t===`overdue`?e.status===`overdue`:t===`requested`?e.state===`requested`:t!==`received`||e.status===`received`||e.status===`waived`}function Oe(e,t,n){let r=e.groups.flatMap(e=>e.items),i=e.items_done,a=e.items_total?Math.round(i/e.items_total*100):0,o={all:r.length,overdue:r.filter(e=>e.status===`overdue`).length,requested:r.filter(e=>e.state===`requested`).length,received:r.filter(e=>e.state!==`requested`).length},c=e.permissions;return s`<!-- Breadcrumbs & Meta Bar -->
<div class="flex items-center justify-between pb-space-sm">
<nav aria-label="Breadcrumb" class="flex items-center gap-space-xs text-on-surface-variant font-label-default text-label-default">
${n===`analyst`?s`<a class="hover:text-primary transition-colors flex items-center gap-1 rounded" href="${E(`analyst`,e.id)}">${l(`arrow_back`)} Analyst file</a>`:s`<a class="hover:text-primary transition-colors flex items-center gap-1 rounded" href="#/queue">${l(`arrow_back`)} Applications</a>`}
<span class="text-outline-variant font-normal" aria-hidden="true">/</span>
<span class="font-tabular-data text-tabular-data text-on-surface">${e.id}</span>
<span class="text-outline-variant font-normal" aria-hidden="true">/</span>
<span class="text-on-surface font-semibold" aria-current="page">${e.client_name}</span>
</nav>
<div class="flex items-center gap-space-sm text-on-surface-variant font-label-compact text-label-compact">
<span class="flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container text-on-surface"><span class="w-1.5 h-1.5 rounded-full bg-primary-container" aria-hidden="true"></span>${e.applicant_type}</span>
<span class="text-outline-variant" aria-hidden="true">•</span><span>${e.city}</span>
</div></div>

<!-- Application Overview Banner -->
<section class="bg-surface-container-lowest rounded-xl p-space-lg mb-space-md shadow-sm">
<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
<div class="flex flex-col gap-space-xs">
<div class="flex flex-wrap items-center gap-space-sm">
<h1 class="font-headline-md text-headline-md text-on-surface tracking-tight">${e.client_name}</h1>
<span class="px-space-sm py-0.5 rounded bg-secondary-container text-on-secondary-fixed font-label-compact text-label-compact font-bold uppercase tracking-wider">Sub-₹25L · ${e.loan_band}</span>
<span class="px-space-sm py-0.5 rounded-full font-label-compact text-label-compact font-bold uppercase tracking-wider ${e.status===`overdue`?`bg-error-container text-on-error-container`:e.status===`due_today`?`bg-tertiary-fixed text-on-tertiary-fixed-variant`:e.status===`complete`?`bg-secondary-container text-on-secondary-fixed`:`bg-surface-container-high text-on-surface`}">${e.status_label}</span>
</div>
<div class="flex flex-wrap items-center gap-x-space-lg gap-y-1 text-on-surface-variant font-body-compact text-body-compact">
<div class="flex items-center gap-1">${l(`payments`,`text-[15px] text-primary`)}<span class="font-medium text-on-surface">${e.product}</span></div>
<div class="flex items-center gap-1">${l(`badge`,`text-[15px] text-secondary`)}<span>RM: <strong class="text-on-surface font-medium">${e.rm.name}</strong></span></div>
<div class="flex items-center gap-1">${l(`schedule`,`text-[15px] text-on-surface-variant`)}<span>Opened: <strong>${v(e.opened_on)}</strong> <span class="${e.status===`overdue`?`text-error`:``} font-medium">(${e.age_days} days open)</span></span></div>
</div></div>
<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md">
<div class="bg-surface-container-low px-space-md py-space-sm rounded-lg flex items-center gap-space-md">
<div class="relative w-11 h-11 flex items-center justify-center" role="img" aria-label="${i} of ${e.items_total} items received or waived">
<svg class="w-11 h-11 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
<path class="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3.5"></path>
<path class="text-primary-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="${a}, 100" stroke-linecap="round" stroke-width="3.5"></path>
</svg><span class="absolute font-label-default text-label-default text-on-surface font-bold">${i}/${e.items_total}</span></div>
<div class="flex flex-col"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase tracking-wider">Completion</span>
<div class="flex items-center gap-1 text-on-surface font-label-default text-label-default">
<span class="text-error font-bold">${e.overdue_count} Overdue</span><span class="text-outline-variant" aria-hidden="true">•</span><span class="text-tertiary-container font-medium">${e.due_today_count} Due today</span>
</div></div></div>
${c.draft_reminder&&e.outstanding_count?s`<div class="flex items-center gap-space-xs">
<button type="button" class="h-9 px-space-md rounded bg-primary-container hover:bg-primary text-on-primary font-label-default text-label-default flex items-center gap-1.5 transition-all shadow-sm" id="btn-request-all">${l(`bolt`)}<span>${e.draft?`Open Reminder Draft`:`Request All Outstanding`}</span><span class="px-1 rounded bg-surface-container-lowest/20 font-label-compact text-label-compact text-on-primary">${e.draft?e.draft.items:e.outstanding_count}</span></button>
</div>`:``}
</div></div></section>

<div class="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
<div class="xl:col-span-8 flex flex-col gap-space-md">
<div class="bg-surface-container-lowest rounded-lg p-space-sm px-space-md flex flex-wrap items-center justify-between gap-space-sm shadow-sm">
<div class="flex items-center gap-space-xs font-label-default text-label-default text-on-surface" role="group" aria-label="Filter view">
<span class="font-semibold uppercase tracking-wider text-on-surface-variant">Filter View:</span>
${[[`all`,`All (${o.all})`],[`overdue`,`Overdue (${o.overdue})`],[`requested`,`Requested (${o.requested})`],[`received`,`Received / Waived (${o.received})`]].map(([e,n])=>e===t?s`<button type="button" data-filter="${e}" aria-pressed="true" class="px-space-sm py-1 rounded bg-primary text-on-primary font-medium">${n}</button>`:s`<button type="button" data-filter="${e}" aria-pressed="false" class="px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant">${n}</button>`)}
</div>
<div class="flex items-center gap-space-sm font-label-compact text-label-compact text-on-surface-variant"><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-error" aria-hidden="true"></span> Overdue = past the due date by the configured threshold</span></div>
</div>
${e.groups.map((e,n)=>ke(e,n,t,c))}
</div>

<div class="xl:col-span-4 flex flex-col gap-space-md">
${je(e)}
${Ne(e.timeline)}
<div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex items-center justify-between">
<div class="flex items-center gap-space-sm">
<div class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold font-label-default text-label-default" aria-hidden="true">${e.contact_name.split(` `).map(e=>e[0]).join(``).slice(0,2)}</div>
<div class="flex flex-col"><span class="font-label-default text-label-default text-on-surface font-semibold">${e.contact_name}</span><span class="font-body-compact text-body-compact text-on-surface-variant">Client contact (fictitious)</span></div>
</div>
<span class="font-label-compact text-label-compact text-on-surface-variant">Contact via RM ${e.rm.name}</span>
</div>
</div></div>`}function ke(e,t,n,r){let i=e.items.filter(e=>De(e,n));if(!i.length)return s``;let a=e.overdue?s`<span class="px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-label-compact text-label-compact font-semibold">${e.done} of ${e.total} Complete · ${e.overdue} Overdue</span>`:s`<span class="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-compact text-label-compact font-semibold">${e.done} of ${e.total} Complete</span>`,o=e.done===e.total?s`<span class="px-space-sm py-0.5 rounded bg-surface-container-highest/60 text-on-surface font-label-compact text-label-compact">Round ${e.max_round} Cleared</span>`:s`<span class="text-on-surface-variant font-label-compact text-label-compact">Request round ${e.max_round}</span>`;return s`<div class="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
<div class="bg-surface-container-low px-space-md py-space-sm flex items-center justify-between">
<div class="flex items-center gap-space-sm">${l(Ce[e.name]??`folder`,`text-primary text-[18px]`)}<h2 class="font-headline-sm text-headline-sm text-on-surface">${t+1}. ${e.name}</h2>${a}</div>
${o}
</div>
${i.map(e=>Ae(e,r))}
</div>`}function Ae(e,t){let n=e.state===`requested`,r=e.status===`overdue`?s`<div class="w-6 h-6 rounded bg-error-container flex items-center justify-center text-on-error-container mt-0.5">${l(`priority_high`)}</div>`:e.status===`due_today`?s`<div class="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center text-tertiary mt-0.5">${l(`alarm`)}</div>`:e.status===`on_track`?s`<div class="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center text-tertiary mt-0.5">${l(`pending`)}</div>`:e.status===`waived`?s`<div class="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-on-surface-variant mt-0.5">${l(`do_not_disturb_on`)}</div>`:s`<div class="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-primary-container mt-0.5">${l(`check_circle`)}</div>`,i;if(e.status===`received`)i=s`Req: ${_(e.requested_on)} · Round ${e.round} · Owner: <strong class="text-on-surface">${e.owner}</strong> · Received ${e.received_at?x(e.received_at):``} · Confirmed by <strong class="text-on-surface">${e.received_by??``}</strong>`;else if(e.status===`waived`)i=s`Waived by <strong class="text-on-surface font-medium">${e.waived_by??``}</strong> · <span class="italic text-on-surface-variant">Reason: ${e.waived_reason??``}</span>`;else{let t=e.status===`overdue`?s`<span class="text-error font-bold font-tabular-data">Due ${_(e.due_date)} · ${e.days_past_due} days overdue</span>`:e.status===`due_today`?s`<span class="text-tertiary-container font-semibold">Due: ${b(e.due_date)} (${_(e.due_date)})</span>`:s`<span class="text-on-surface-variant">Due: ${_(e.due_date)}</span>`;i=s`Req: ${_(e.requested_on)} · Round ${e.round} · Owner: <strong class="text-on-surface">${e.owner}</strong> · ${t}`}return s`<div class="p-space-md ${e.status===`overdue`?`bg-error-container/15 hover:bg-error-container/25`:`hover:bg-surface-container-low/40`} transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-space-sm ${e.status===`waived`?`opacity-90`:``}">
<div class="flex items-start gap-space-sm min-w-0">${r}
<div class="flex flex-col min-w-0">
<div class="flex items-center gap-space-xs flex-wrap">
<span class="font-label-default text-label-default ${e.status===`overdue`?`text-error font-bold`:e.status===`waived`?`text-on-surface-variant font-medium line-through`:`text-on-surface font-semibold`}">${e.name}</span>
${e.analyst_request_id&&n?s`<span class="px-space-xs rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-compact text-label-compact font-bold">Analyst request</span>`:``}
</div>
<span class="font-body-compact text-body-compact text-on-surface-variant">${i}</span>
</div></div>
<div class="flex items-center gap-space-xs self-end md:self-center shrink-0">
<span class="px-space-sm py-0.5 rounded-full ${oe[e.status]} font-label-compact text-label-compact font-bold uppercase tracking-wider flex items-center gap-1">${e.status===`received`?l(`verified`,`text-[13px]`):``}${e.status_label}</span>
${n&&t.draft_reminder?s`<button type="button" data-action="draft" data-item="${e.id}" class="px-space-sm py-1 rounded bg-primary-container text-on-primary hover:bg-primary font-label-compact text-label-compact font-medium flex items-center gap-1 transition-colors">${l(`edit_note`,`text-[14px]`)} Create Reminder Draft</button>`:``}
${n&&t.mark_received?s`<button type="button" data-action="receive" data-item="${e.id}" class="px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-compact text-label-compact flex items-center gap-1 transition-colors">${l(`inventory`,`text-[14px]`)} Mark Received</button>`:``}
${n&&t.waive?s`<button type="button" data-action="waive" data-item="${e.id}" class="px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-compact text-label-compact transition-colors">Waive Item</button>`:``}
</div></div>`}function je(e){if(!e.blocking.length)return s`<section class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm relative overflow-hidden">
<div class="absolute top-0 left-0 bottom-0 w-1.5 bg-primary" aria-hidden="true"></div>
<div class="pl-space-xs flex flex-col gap-space-sm"><div class="flex items-center gap-space-xs text-primary">${l(`task_alt`,`text-[20px]`)}<h2 class="font-headline-sm text-headline-sm font-bold tracking-tight">File complete</h2></div>
<p class="font-body-compact text-body-compact text-on-surface">Every checklist item is received or waived. ${e.analyst?s`The file is ready for <strong>${e.analyst.name}</strong>.`:`The file is ready for credit analysis.`}</p></div></section>`;let t=e.blocking.filter(e=>e.status===`overdue`);return s`<section class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm relative overflow-hidden" aria-labelledby="blocker-title">
<div class="absolute top-0 left-0 bottom-0 w-1.5 ${t.length?`bg-error`:`bg-tertiary`}" aria-hidden="true"></div>
<div class="pl-space-xs flex flex-col gap-space-sm">
<div class="flex items-center justify-between">
<div class="flex items-center gap-space-xs ${t.length?`text-error`:`text-tertiary`}">${l(`block`,`text-[20px]`)}<h2 id="blocker-title" class="font-headline-sm text-headline-sm font-bold tracking-tight">What is blocking this file</h2></div>
<span class="px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-label-compact text-label-compact font-bold uppercase">${e.blocking.length} outstanding</span>
</div>
<p class="font-body-compact text-body-compact text-on-surface">${e.analyst?s`Credit analysis by <strong>${e.analyst.name}</strong> is waiting on these client documents:`:`The file cannot go to credit analysis until these client documents arrive:`}</p>
<div class="bg-surface-container-low rounded p-space-sm flex flex-col gap-space-xs text-on-surface font-body-compact text-body-compact">
${e.blocking.map(e=>s`<div class="flex items-start gap-space-xs">${l(`arrow_right`,`${e.status===`overdue`?`text-error`:`text-tertiary`} text-[16px] mt-0.5`)}<div><strong class="text-on-surface font-semibold">${e.name}</strong>
<p class="text-on-surface-variant font-body-compact text-body-compact">Owner: ${e.owner} · ${e.status===`overdue`?`${e.days_past_due} days overdue`:e.status===`due_today`?`due today`:`due ${_(e.due_date)}`} · requested ${e.age_days} days ago</p></div></div>`)}
</div>
${e.analyst_requests.length?s`<div class="flex flex-col gap-space-xs">${e.analyst_requests.map(e=>s`<div class="p-space-sm rounded bg-tertiary-fixed/60 text-on-tertiary-fixed font-body-compact text-body-compact"><strong>Analyst request from ${e.analyst}</strong> (${x(e.created_at)}): ${e.note}</div>`)}</div>`:``}
</div></section>`}var Me={reminder_drafted:`bg-primary`,document_received:`bg-primary-container`,file_marked_complete:`bg-primary`};function Ne(e){return s`<section class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col" aria-labelledby="tl-title">
<div class="flex items-center justify-between pb-space-sm border-b border-surface-container">
<div class="flex items-center gap-space-xs">${l(`history`,`text-primary text-[18px]`)}<h2 id="tl-title" class="font-headline-sm text-headline-sm text-on-surface">Activity &amp; Audit Log</h2></div>
<span class="font-label-compact text-label-compact text-on-surface-variant">Immutable Trail</span>
</div>
<ol class="relative pl-6 pt-space-md flex flex-col gap-space-md">
<div class="absolute top-space-md bottom-2 left-2.5 w-0.5 bg-surface-container" aria-hidden="true"></div>
${e.map((e,t)=>s`<li class="relative flex flex-col gap-0.5 ${t>=6?`hidden`:``}" ${t>=6?`data-extra-event`:``}>
<div class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ${Me[e.event_type]??`bg-surface-container-highest`} ring-4 ring-surface-container-lowest" aria-hidden="true"></div>
<div class="flex items-center justify-between gap-space-xs">
<span class="font-label-compact text-label-compact ${t===0?`text-primary font-bold`:`text-on-surface-variant font-medium`}">${x(e.occurred_at)}</span>
<span class="px-space-xs rounded bg-surface-container text-on-surface font-label-compact text-label-compact">${e.event_label}</span>
</div>
<span class="font-body-compact text-body-compact text-on-surface">${e.reason}</span>
<span class="font-label-compact text-label-compact text-on-surface-variant">${e.actor_name} · ${e.actor_role_label}</span>
</li>`)}
</ol>
${e.length>6?s`<button type="button" id="history-toggle" class="mt-space-md pt-space-xs border-t border-surface-container w-full text-center text-primary hover:text-primary-container font-label-compact text-label-compact font-medium transition-colors">View Full Audit History (${e.length-6} more entries) →</button>`:``}
</section>`}var z=null;async function B(t,r){if(!r.id){let e=await n.get(`/api/queue`),r=e.rows.find(e=>e.draft)??e.rows[0];if(!r){t.root.innerHTML=s`<p class="p-space-lg">No applications in your view.</p>`.value;return}window.location.replace(E(`composer`,r.id));return}let i=await n.get(`/api/applications/${encodeURIComponent(r.id)}`),a=null;try{a=await n.get(`/api/applications/${i.id}/reminders/current`)}catch(t){if(!(t instanceof e&&t.status===404))throw t}if(!a){t.root.innerHTML=Fe(i).value,t.root.querySelector(`#create-draft`)?.addEventListener(`click`,async()=>{await n.post(`/api/applications/${i.id}/reminders`,{}),await B(t,r)}),t.root.querySelector(`#btn-chase-nodraft`)?.addEventListener(`click`,async a=>{let o=a.currentTarget;o.disabled=!0,o.textContent=`Agent running…`;try{let e=await n.post(`/api/applications/${i.id}/chase-agent`,{});z=await n.get(`/api/agent-traces/${e.trace_id}`),t.toast(`Document-chase agent finished · $${e.total_cost_usd.toFixed(6)}`)}catch(n){t.toast(n instanceof e?n.message:`Agent run failed`)}await B(t,r),document.getElementById(`composer-trace`)?.scrollIntoView({block:`start`})});return}let o=await n.get(`/api/agents`),c=await n.get(`/api/reminders/${a.id}/ai-tasks`).catch(()=>[]),l=await n.get(`/api/agent-traces?application_id=${i.id}&limit=5`).catch(()=>[]),u={r:a,app:i,agentsInfo:o,tasks:c,traces:l,editing:!1,openTrace:z??void 0};z=null,V(t,u)}function V(e,t){e.root.innerHTML=Le(e,t).value,Pe(e,t)}function Pe(t,r){let i=t.root,a=r.r,o=async i=>{try{r.r=await n.patch(`/api/reminders/${a.id}`,i),r.editing=!1,V(t,r)}catch(n){t.toast(n instanceof e?n.message:`Could not update the draft`),V(t,r)}};i.querySelectorAll(`.doc-checkbox`).forEach(e=>e.addEventListener(`change`,()=>{let n=[...i.querySelectorAll(`.doc-checkbox:checked`)].map(e=>Number(e.value));n.length?o({item_ids:n}):(e.checked=!0,t.toast(`Keep at least one document in the reminder`))})),i.querySelector(`#tone-selector`)?.addEventListener(`change`,e=>void o({round:Number(e.target.value)})),i.querySelector(`#due-date`)?.addEventListener(`change`,e=>void o({due_date:e.target.value})),i.querySelector(`#btn-custom-notes`)?.addEventListener(`click`,()=>{r.editing=!0,V(t,r),t.root.querySelector(`#body-editor`)?.focus()}),i.querySelector(`#btn-save-text`)?.addEventListener(`click`,()=>void o({body:i.querySelector(`#body-editor`).value})),i.querySelector(`#btn-cancel-text`)?.addEventListener(`click`,()=>{r.editing=!1,V(t,r)});let s=async(o,s)=>{let c=i.querySelector(`#ai-tone`)?.value;s.disabled=!0,s.textContent=o===`ai-reword`?`Rewording…`:`Reviewing…`;try{let e=await n.post(`/api/reminders/${a.id}/${o}`,{tone:c});e.reminder&&(r.r=e.reminder),r.lastTask=e.task,r.tasks=await n.get(`/api/reminders/${a.id}/ai-tasks`),t.toast(`${o===`ai-reword`?`Reworded`:`Reviewed`} by ${e.task.served_by} · $${e.task.llm_cost_usd.toFixed(6)}`)}catch(i){t.toast(i instanceof e?i.message:`AI request failed`),r.tasks=await n.get(`/api/reminders/${a.id}/ai-tasks`).catch(()=>r.tasks)}V(t,r)};i.querySelector(`#btn-ai-reword`)?.addEventListener(`click`,e=>void s(`ai-reword`,e.currentTarget)),i.querySelector(`#btn-ai-critique`)?.addEventListener(`click`,e=>void s(`critique`,e.currentTarget)),i.querySelector(`#btn-ai-chase`)?.addEventListener(`click`,async a=>{let o=a.currentTarget,s=i.querySelector(`#ai-tone`)?.value;o.disabled=!0,o.textContent=`Agent running…`;try{let e=await n.post(`/api/applications/${r.app.id}/chase-agent`,{tone:s});r.r=e.reminder,r.openTrace=await n.get(`/api/agent-traces/${e.trace_id}`),t.toast(`Document-chase agent ${e.status===`ok`?`finished`:`finished with template fallback`} · $${e.total_cost_usd.toFixed(6)}`)}catch(n){t.toast(n instanceof e?n.message:`Agent run failed`)}r.tasks=await n.get(`/api/reminders/${r.r.id}/ai-tasks`).catch(()=>r.tasks),r.traces=await n.get(`/api/agent-traces?application_id=${r.app.id}&limit=5`).catch(()=>r.traces),V(t,r),document.getElementById(`composer-trace`)?.scrollIntoView({block:`start`})}),i.querySelectorAll(`[data-view-trace]`).forEach(e=>e.addEventListener(`click`,async()=>{r.openTrace=await n.get(`/api/agent-traces/${e.dataset.viewTrace}`),V(t,r),document.getElementById(`composer-trace`)?.scrollIntoView({block:`start`})}));let c=i.querySelector(`#signoff-modal`);i.querySelector(`#btn-approve-send`)?.addEventListener(`click`,()=>c?.showModal()),i.querySelector(`#modal-cancel-btn`)?.addEventListener(`click`,()=>c?.close()),i.querySelector(`#modal-close-btn`)?.addEventListener(`click`,()=>c?.close()),i.querySelector(`#modal-confirm-btn`)?.addEventListener(`click`,async()=>{try{await n.post(`/api/reminders/${a.id}/approve-send`),c?.close(),t.toast(`Reminder approved, sent (simulated e-mail) and logged`),t.go(E(`checklist`,r.app.id))}catch(n){c?.close(),t.toast(n instanceof e?n.message:`Could not send`)}});let l=i.querySelector(`#schedule-modal`);i.querySelector(`#btn-schedule`)?.addEventListener(`click`,()=>l?.showModal()),i.querySelector(`#schedule-cancel`)?.addEventListener(`click`,()=>l?.close()),i.querySelector(`#schedule-confirm`)?.addEventListener(`click`,async()=>{let o=i.querySelector(`#schedule-at`).value;if(!o)return;let s=new Date(`${o}:00+05:30`).toISOString();try{await n.post(`/api/reminders/${a.id}/schedule`,{send_at:s}),l?.close(),t.toast(`Approved and scheduled. It will send at the chosen time.`),t.go(E(`checklist`,r.app.id))}catch(n){t.toast(n instanceof e?n.message:`Could not schedule`)}})}function Fe(e){return s`<div class="max-w-2xl mx-auto mt-space-xl bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-md">
<h1 class="font-headline-md text-headline-md">Reminder Composer · ${e.id}</h1>
<p class="font-body-default text-body-default text-on-surface-variant">${e.client_name} has no open draft. ${e.outstanding_count?`${e.outstanding_count} document(s) are outstanding.`:`Every document is received or waived.`}</p>
<div class="flex gap-space-sm">
${e.outstanding_count&&e.permissions.draft_reminder?s`<button type="button" id="btn-chase-nodraft" class="h-8 px-space-md rounded bg-primary text-on-primary font-label-default text-label-default flex items-center gap-1.5">${l(`smart_toy`)} Run document-chase agent</button>
<button type="button" id="create-draft" class="h-8 px-space-md rounded bg-surface-container-high text-on-surface font-label-default text-label-default">Create template draft only</button>`:``}
<a class="h-8 px-space-md rounded bg-surface-container-high text-on-surface font-label-default text-label-default flex items-center" href="${E(`checklist`,e.id)}">Back to checklist</a>
</div></div>`}var Ie={1:`Reminder Round 1 — Gentle advisory (First notice)`,2:`Reminder Round 2 — Firm, formal reminder`,3:`Reminder Round 3 — Final notice`};function Le(e,t){let n=t.r,r=e.session.user,i=r.role===`rm`&&r.id===n.named_rm.id,a=new Set(n.item_ids),o=new Date(Date.now()+198e5).toISOString().slice(0,10),u=t.agentsInfo,d=u.enabled&&(u.agents.find(e=>e.agent_key===`reminder_rewriter`)?.enabled??u.agents.find(e=>e.agent_key===`reminder_rewriter`)?.config?.enabled??!1),f=u.enabled&&(u.agents.find(e=>e.agent_key===`reminder_critic`)?.enabled??u.agents.find(e=>e.agent_key===`reminder_critic`)?.config?.enabled??!1),p=u.agents.find(e=>e.agent_key===`reminder_rewriter`)?.tone??`formal`,m=t.tasks.find(e=>e.task===`critique`&&e.status===`ok`);return s`<div class="flex flex-col gap-space-sm mb-space-md">
<div class="flex items-center justify-between flex-wrap gap-space-sm">
<nav aria-label="Breadcrumb" class="flex items-center gap-space-xs text-on-surface-variant font-label-default text-label-default">
<a class="hover:text-primary transition-colors flex items-center gap-0.5 rounded" href="#/queue">${l(`folder_open`)}<span>SME Queue</span></a>
${l(`chevron_right`,`text-[14px] text-outline-variant`)}
<a class="hover:text-primary transition-colors rounded" href="${E(`checklist`,n.application_id)}">${n.application_id}</a>
${l(`chevron_right`,`text-[14px] text-outline-variant`)}
<span class="text-on-surface font-semibold" aria-current="page">Reminder Composer (Dispatch Authorization)</span>
</nav>
<div class="flex items-center gap-1.5 px-space-sm py-1 rounded bg-secondary-container text-on-secondary-fixed font-label-compact text-label-compact">
<span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span><span>Session Actor: ${r.name} (${r.role_label})</span></div>
</div>
<div class="w-full bg-surface-container-highest/60 rounded-lg p-space-md flex items-start justify-between gap-space-md shadow-sm">
<div class="flex items-start gap-space-md">
<div class="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm mt-0.5">${l(`verified_user`,`text-[20px]`)}</div>
<div class="flex flex-col">
<div class="flex items-center gap-space-sm flex-wrap"><h1 class="font-headline-sm text-headline-sm text-on-surface tracking-tight">Draft for RM Review — Strict Human-in-the-Loop Protocol</h1>
<span class="px-space-sm py-0.5 rounded-full bg-error-container text-on-error-container font-label-compact text-label-compact uppercase tracking-wider font-semibold">Zero Autonomous Dispatch</span></div>
<p class="font-body-compact text-body-compact text-on-surface-variant mt-0.5">Drafts never send automatically. Only the named RM, <strong>${n.named_rm.name}</strong>, can approve this reminder to ${n.client_name}. The server enforces this.</p>
</div></div>
<div class="hidden xl:flex flex-col items-end text-right shrink-0"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase tracking-wider">Application</span><span class="font-tabular-data text-tabular-data font-semibold text-primary">${n.application_id} · ${n.product}</span></div>
</div></div>

<div class="w-full bg-surface-container-lowest rounded-xl p-space-md mb-space-md shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
<div class="flex items-center gap-space-md">
<div class="w-12 h-12 rounded-lg bg-surface-container-high text-primary flex items-center justify-center font-headline-md text-headline-md font-bold shrink-0" aria-hidden="true">${te(n.client_name)}</div>
<div class="flex flex-col"><h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">${n.client_name}</h2>
<div class="flex items-center gap-space-md text-on-surface-variant font-body-compact text-body-compact mt-1 flex-wrap">
<span class="flex items-center gap-1">${l(`person`,`text-[15px] text-on-surface-variant`)}<strong class="text-on-surface">Contact:</strong> ${n.contact_name}</span>
<span class="text-outline-variant" aria-hidden="true">•</span>
<span class="flex items-center gap-1">${l(`mail`,`text-[15px] text-on-surface-variant`)}${n.contact_email}</span>
</div></div></div>
<div class="flex items-center gap-space-lg self-end lg:self-center bg-surface-container-low px-space-lg py-space-sm rounded-lg">
<div class="flex flex-col text-right"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase">Current Stage</span><span class="font-label-default text-label-default font-semibold text-tertiary">${t.app.stage_label}</span></div>
<div class="w-px h-8 bg-surface-container-high" aria-hidden="true"></div>
<div class="flex flex-col text-right"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase">Pending Checklist</span><span class="font-tabular-data text-tabular-data font-semibold text-error">${t.app.outstanding_count} of ${n.items_total} Docs Missing</span></div>
<div class="w-px h-8 bg-surface-container-high" aria-hidden="true"></div>
<div class="flex flex-col text-right"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase">Assigned RM</span><span class="font-label-default text-label-default font-medium text-on-surface">${n.named_rm.name}</span></div>
</div></div>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-space-md mb-space-xl">
<div class="lg:col-span-7 flex flex-col gap-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
<div class="flex items-center justify-between pb-space-sm mb-space-sm">
<div class="flex items-center gap-space-xs">${l(`checklist_rtl`,`text-primary text-[20px]`)}<h3 class="font-headline-sm text-headline-sm text-on-surface">1. Target Document Checklist</h3></div>
<span class="px-space-sm py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-compact text-label-compact font-semibold">${n.item_ids.length} Selected for Reminder</span>
</div>
<p class="font-body-compact text-body-compact text-on-surface-variant mb-space-md">Tick the outstanding documents to include. They are listed in the client message exactly as named. Changing the selection re-renders the template.</p>
<div class="flex flex-col gap-space-xs">
${n.outstanding_items.map(e=>s`<label class="flex items-start gap-space-md p-space-md rounded-lg ${a.has(e.id)?`bg-surface-container-low`:`bg-surface-container-lowest opacity-90`} hover:bg-surface-container transition-colors cursor-pointer group">
<input ${a.has(e.id)?c(`checked`):``} ${n.state===`draft`?``:c(`disabled`)} class="doc-checkbox mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer" type="checkbox" value="${e.id}"/>
<div class="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
<div class="flex flex-col"><span class="font-body-default text-body-default font-medium text-on-surface group-hover:text-primary transition-colors">${e.name}</span>
<span class="font-label-compact text-label-compact text-on-surface-variant">${e.category} · Owner: ${e.owner} · Requested ${_(e.requested_on)} · Round ${e.round}</span></div>
<span class="px-space-sm py-0.5 rounded-full font-label-compact text-label-compact font-semibold flex items-center gap-1 shrink-0 ${e.status===`overdue`?`bg-error-container text-on-error-container`:e.status===`due_today`?`bg-tertiary-fixed text-on-tertiary-fixed-variant`:`bg-surface-container text-on-surface-variant`}">${l(e.status===`overdue`?`schedule`:`alarm`,`text-[12px]`)}${e.status===`overdue`?`Overdue · ${e.days_past_due} days`:e.status===`due_today`?`Due Today`:`Due ${_(e.due_date)}`}</span>
</div></label>`)}
</div></div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div><div class="flex items-center gap-space-xs mb-space-xs">${l(`share`,`text-primary text-[20px]`)}<h3 class="font-headline-sm text-headline-sm text-on-surface">2. Dispatch Channel</h3></div>
<p class="font-body-compact text-body-compact text-on-surface-variant mb-space-md">Sent only through Kestrel's existing mail system after RM approval.</p>
<div class="flex items-start justify-between p-space-sm rounded-lg bg-surface-container-low">
<div class="flex items-start gap-space-sm"><div class="w-7 h-7 rounded bg-surface-container-highest text-primary flex items-center justify-center shrink-0 mt-0.5">${l(`mark_email_read`)}</div>
<div class="flex flex-col"><span class="font-label-default text-label-default text-on-surface font-semibold">Official Email Delivery</span><span class="font-label-compact text-label-compact text-on-surface-variant">To: ${n.contact_email} · simulated in this prototype</span></div></div>
<span class="font-label-compact text-label-compact text-primary font-semibold">On</span>
</div></div></div>
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div><div class="flex items-center gap-space-xs mb-space-xs">${l(`tune`,`text-primary text-[20px]`)}<h3 class="font-headline-sm text-headline-sm text-on-surface">3. Escalation &amp; Due Date</h3></div>
<p class="font-body-compact text-body-compact text-on-surface-variant mb-space-md">Formality tier and unambiguous deadline.</p>
<div class="flex flex-col gap-space-xs mb-space-md"><label for="tone-selector" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Template Escalation Round</label>
<div class="relative"><select ${n.state===`draft`?``:c(`disabled`)} class="w-full h-8 pl-space-sm pr-8 rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact appearance-none cursor-pointer" id="tone-selector">
${[1,2,3].map(e=>s`<option value="${e}" ${e===n.round?c(`selected`):``}>${Ie[e]}</option>`)}
</select><span class="material-symbols-outlined absolute right-2 top-2 text-[16px] pointer-events-none text-on-surface-variant" aria-hidden="true">expand_more</span></div></div>
<div class="flex flex-col gap-space-xs"><label for="due-date" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Submission Deadline</label>
<input id="due-date" type="date" min="${o}" value="${n.due_date}" ${n.state===`draft`?``:c(`disabled`)} class="w-full h-8 px-space-sm rounded bg-surface-container-low text-primary font-tabular-data text-tabular-data font-medium"/>
<span class="font-label-compact text-label-compact text-on-surface-variant">${n.due_label}</span></div>
</div>
<div class="mt-space-md p-space-sm rounded bg-surface-container-low flex flex-col"><span class="font-label-compact text-label-compact text-on-surface-variant">Client contact for questions</span><span class="font-tabular-data text-tabular-data font-semibold text-on-surface">RM ${n.named_rm.name}</span></div>
</div></div>

${Re(t,d,f,p,m)}
</div>

<div class="lg:col-span-5 flex flex-col gap-space-md">
<div class="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden flex flex-col">
<div class="bg-surface-container-highest px-space-md py-space-sm flex items-center justify-between">
<div class="flex items-center gap-space-xs"><span class="w-2 h-2 rounded-full bg-error" aria-hidden="true"></span><span class="font-label-compact text-label-compact uppercase tracking-widest font-bold text-on-surface">${n.state===`draft`?`Draft for RM review (not sent)`:n.state===`scheduled`?`Approved · scheduled`:`Sent`}</span></div>
<div class="flex items-center gap-1 text-on-surface-variant font-label-compact text-label-compact">${l(`preview`,`text-[14px]`)}<span>Revision ${n.revision}${n.ai_assisted?` · AI-assisted wording`:n.edited_text?` · edited by hand`:` · template`}</span></div>
</div>
<div class="p-space-lg bg-surface-container-lowest flex flex-col gap-space-md">
<div class="rounded-xl p-space-md bg-surface-container-low text-on-surface flex flex-col gap-space-sm shadow-sm">
<div class="flex items-center justify-between pb-space-xs"><div class="flex items-center gap-space-xs">${l(`mail`,`text-primary text-[18px]`)}<span class="font-label-default text-label-default font-semibold text-on-surface">Email body</span></div>
<span class="font-tabular-data text-tabular-data text-on-surface-variant text-[11px]">To: ${n.contact_email}</span></div>
${t.editing?s`<label for="body-editor" class="sr-only">Reminder text</label><textarea id="body-editor" rows="16" class="w-full p-space-sm rounded bg-surface-container-lowest text-on-surface font-body-compact text-body-compact">${n.body}</textarea>
<div class="flex justify-end gap-space-xs"><button type="button" id="btn-cancel-text" class="h-8 px-space-md rounded bg-surface-container font-label-default text-label-default">Cancel</button><button type="button" id="btn-save-text" class="h-8 px-space-md rounded bg-primary text-on-primary font-label-default text-label-default">Save text</button></div>`:s`<div class="font-body-compact text-body-compact text-on-surface leading-relaxed whitespace-pre-wrap" id="message-text-target">${n.body}</div>`}
</div>
<div class="p-space-md rounded-lg bg-surface-container-high/60 text-on-surface flex items-start gap-space-sm">${l(`lock_clock`,`text-primary text-[18px] shrink-0 mt-0.5`)}
<div class="flex flex-col"><span class="font-label-default text-label-default font-semibold text-on-surface">Audit trail</span>
<p class="font-body-compact text-body-compact text-on-surface-variant mt-0.5">Approving records a permanent, hash-chained entry in the application timeline with RM <strong>${n.named_rm.name}</strong> as the approving actor. A sent reminder cannot be recalled.</p></div></div>
</div></div>
</div></div>

<div class="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-md flex flex-col md:flex-row items-center justify-between gap-space-md mb-space-lg">
<div class="flex items-center gap-space-sm w-full md:w-auto">
<a class="h-8 px-space-md rounded bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors font-body-default text-body-default font-medium flex items-center gap-1.5 justify-center" href="${E(`checklist`,n.application_id)}">${l(`arrow_back`)}<span>Cancel &amp; Return to Checklist</span></a>
${n.state===`draft`?s`<button type="button" class="h-8 px-space-md rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-body-default text-body-default font-medium flex items-center gap-1.5" id="btn-custom-notes">${l(`edit_note`)}<span>Edit Text</span></button>`:``}
</div>
<div class="flex items-center gap-space-sm w-full md:w-auto justify-end flex-wrap">
${n.state===`draft`?i?s`<button type="button" class="h-8 px-space-md rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-body-default text-body-default font-medium flex items-center gap-1.5" id="btn-schedule">${l(`schedule_send`)}<span>Approve &amp; Schedule</span></button>
<button type="button" class="h-8 px-space-lg rounded bg-primary text-on-primary hover:bg-primary-container transition-all font-body-default text-body-default font-semibold flex items-center gap-space-xs shadow-sm" id="btn-approve-send">${l(`verified`,`text-[18px]`)}<span>Approve and Send Now (RM Sign-off)</span></button>`:s`<span class="font-body-compact text-body-compact text-on-surface-variant flex items-center gap-1">${l(`lock`)} Only ${n.named_rm.name} can approve and send this reminder.</span>`:s`<span class="font-body-compact text-body-compact text-on-surface-variant">${n.state===`scheduled`?`Approved by ${n.approved_by}; sends ${n.scheduled_for?x(n.scheduled_for):``}`:`Sent ${n.sent_at?x(n.sent_at):``}`}</span>`}
</div></div>

<dialog id="signoff-modal" aria-labelledby="signoff-title" class="rounded-xl p-0 max-w-lg w-full bg-surface-container-lowest text-on-surface shadow-xl">
<div class="p-space-xl flex flex-col gap-space-md">
<div class="flex items-start justify-between"><div class="flex items-center gap-space-sm"><div class="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">${l(`fingerprint`,`text-[22px]`)}</div>
<div class="flex flex-col"><h2 id="signoff-title" class="font-headline-sm text-headline-sm text-on-surface">Confirm RM Authorization &amp; Dispatch</h2><span class="font-label-compact text-label-compact text-on-surface-variant">This cannot be recalled once sent</span></div></div>
<button type="button" class="text-on-surface-variant hover:text-on-surface p-1 rounded" id="modal-close-btn" aria-label="Close">${l(`close`,`text-[20px]`)}</button></div>
<div class="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs font-body-compact text-body-compact">
<div class="flex justify-between"><span class="text-on-surface-variant">Client:</span><span class="font-semibold">${n.client_name}</span></div>
<div class="flex justify-between"><span class="text-on-surface-variant">Channel:</span><span class="font-semibold">Email (simulated)</span></div>
<div class="flex justify-between"><span class="text-on-surface-variant">Documents requested:</span><span class="font-semibold text-primary">${n.item_ids.length} documents</span></div>
<div class="flex justify-between"><span class="text-on-surface-variant">Deadline:</span><span class="font-tabular-data font-semibold">${v(n.due_date)}</span></div>
</div>
<div class="p-space-sm rounded bg-surface-container-high/50 text-on-surface-variant font-label-compact text-label-compact flex items-center gap-1.5">${l(`gavel`,`text-primary`)}<span>Logged with ${r.name} as approving RM. No automated retry.</span></div>
<div class="flex items-center justify-end gap-space-sm pt-space-xs">
<button type="button" class="h-8 px-space-md rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-body-default text-body-default font-medium" id="modal-cancel-btn">Cancel &amp; Edit</button>
<button type="button" class="h-8 px-space-lg rounded bg-primary text-on-primary hover:bg-primary-container font-body-default text-body-default font-semibold flex items-center gap-1" id="modal-confirm-btn">${l(`send`)}<span>Execute RM Dispatch</span></button>
</div></div></dialog>

<dialog id="schedule-modal" aria-labelledby="schedule-title" class="rounded-xl p-0 max-w-md w-full bg-surface-container-lowest text-on-surface shadow-xl">
<div class="p-space-xl flex flex-col gap-space-md">
<h2 id="schedule-title" class="font-headline-sm text-headline-sm">Approve now, send later</h2>
<p class="font-body-compact text-body-compact text-on-surface-variant">Your approval is recorded now. The reminder is sent at the time you choose (IST, within 14 days).</p>
<label for="schedule-at" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Send at (IST)</label>
<input id="schedule-at" type="datetime-local" class="h-8 px-space-sm rounded bg-surface-container-low"/>
<div class="flex justify-end gap-space-sm"><button type="button" id="schedule-cancel" class="h-8 px-space-md rounded bg-surface-container font-label-default text-label-default">Cancel</button><button type="button" id="schedule-confirm" class="h-8 px-space-md rounded bg-primary text-on-primary font-label-default text-label-default">Approve &amp; schedule</button></div>
</div></dialog>`}function Re(e,t,n,r,i){let a=e.agentsInfo,o=e.lastTask??e.tasks[0],u=a.enabled?``:`AI drafting disabled`,d=null;if(i?.summary)try{d=JSON.parse(i.summary.slice(i.summary.indexOf(`{`),i.summary.lastIndexOf(`}`)+1))}catch{d=null}return s`<section aria-labelledby="ai-title" class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
<div class="flex items-center justify-between flex-wrap gap-space-xs">
<div class="flex items-center gap-space-xs">${l(`auto_awesome`,`text-primary text-[20px]`)}<h3 id="ai-title" class="font-headline-sm text-headline-sm text-on-surface">4. AI assist (optional)</h3></div>
${a.simulated_mode?s`<span class="px-space-sm py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-compact text-label-compact font-bold uppercase">Simulated provider · no real cost</span>`:``}
</div>
${u?s`<p class="p-space-sm rounded bg-surface-container-low font-body-compact text-body-compact text-on-surface-variant">${u}. The reminder uses the approved template only.</p>`:s`<p class="font-body-compact text-body-compact text-on-surface-variant"><strong>Document-chase agent:</strong> reads the outstanding documents, drafts from the approved template, rewords it, has the critic review it, revises once if needed, and hands the draft to the named RM. It cannot send. The rewriter rewords the text only; the result stays a draft for the named RM. Client and contact names are replaced with placeholders before any model call. Every call is costed and logged.</p>
<div class="flex flex-wrap items-end gap-space-sm">
<div class="flex flex-col gap-space-xs"><label for="ai-tone" class="font-label-compact text-label-compact uppercase text-on-surface-variant">Tone</label>
<select id="ai-tone" class="h-8 pl-space-sm pr-6 rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact">${a.tones.map(e=>s`<option value="${e}" ${e===r?c(`selected`):``}>${e[0].toUpperCase()+e.slice(1)}</option>`)}</select></div>
<button type="button" id="btn-ai-chase" ${!t||e.r.state!==`draft`?c(`disabled`):``} class="h-8 px-space-md rounded bg-primary text-on-primary hover:bg-primary-container font-label-default text-label-default flex items-center gap-1.5 disabled:opacity-50">${l(`smart_toy`)} Run document-chase agent</button>
<button type="button" id="btn-ai-reword" ${!t||e.r.state!==`draft`?c(`disabled`):``} class="h-8 px-space-md rounded bg-primary-container text-on-primary hover:bg-primary font-label-default text-label-default flex items-center gap-1.5 disabled:opacity-50">${l(`edit`)} Reword with AI</button>
<button type="button" id="btn-ai-critique" ${n?``:c(`disabled`)} class="h-8 px-space-md rounded bg-surface-container-high text-on-surface hover:bg-surface-variant font-label-default text-label-default flex items-center gap-1.5 disabled:opacity-50">${l(`rate_review`)} Run critique</button>
${t?``:s`<span class="font-label-compact text-label-compact text-error">Rewriter switched off by the Credit Manager</span>`}
</div>`}
${o?ze(o):``}
${e.traces.length?s`<div class="flex flex-col gap-1"><span class="font-label-compact text-label-compact uppercase text-on-surface-variant">Agent traces for this file</span>
<ul class="flex flex-col gap-1">${e.traces.map(e=>s`<li class="flex items-center justify-between gap-space-xs p-space-xs rounded bg-surface-container-low font-body-compact text-body-compact">
<span>${e.kind===`pipeline`?`Document-chase agent`:e.agent_key===`reminder_critic`?`Critic`:`Rewriter`} · ${x(e.created_at)} · ${e.triggered_by} · <span class="font-tabular-data">$${e.total_cost_usd.toFixed(6)}</span></span>
<button type="button" data-view-trace="${e.task_id}" class="h-7 px-space-sm rounded bg-surface-container-high font-label-compact text-label-compact">View trace</button></li>`)}</ul></div>`:``}
<div id="composer-trace">${e.openTrace?T(e.openTrace,e.openTrace.kind===`pipeline`?`Document-chase agent run`:`Agent task`):``}</div>
${d?s`<div class="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1">
<div class="flex items-center justify-between"><span class="font-label-default text-label-default font-semibold">Critique: ${d.score}/5 · ${d.verdict===`ok`?`OK to send`:`Revise suggested`}</span><span class="font-label-compact text-label-compact text-on-surface-variant">${i?i.served_by:``}</span></div>
${d.issues.length?s`<ul class="list-disc pl-5 font-body-compact text-body-compact text-on-surface-variant">${d.issues.map(e=>s`<li>${e}</li>`)}</ul>`:s`<span class="font-body-compact text-body-compact text-on-surface-variant">No issues found.</span>`}
</div>`:``}
</section>`}function ze(e){return s`<div class="p-space-sm rounded-lg ${e.status===`ok`?`bg-surface-container-low`:`bg-error-container/40`} flex flex-col gap-1">
<div class="flex items-center justify-between flex-wrap gap-1">
<span class="font-label-default text-label-default font-semibold">Last AI task: ${e.task===`reword`?`Reword`:`Critique`} · ${e.status===`ok`?`served by ${e.served_by}`:`failed, template kept`}${e.used_fallback?` (fallback)`:``}</span>
<span class="font-tabular-data text-tabular-data font-semibold text-primary">LLM cost $${e.llm_cost_usd.toFixed(6)} · ₹${e.llm_cost_inr.toFixed(4)}${e.simulated?` (simulated)`:``}</span>
</div>
<span class="font-label-compact text-label-compact text-on-surface-variant">${x(e.created_at)} · ${e.tokens} tokens · config v${e.config_version} · task price ₹${e.task_price_inr.toFixed(2)} · ${e.attempts.map(e=>`${e.route}: ${e.provider}/${e.model} ${e.status}${e.error?` (${e.error})`:``} ${e.latency_ms}ms`).join(` → `)}</span>
</div>`}var H=10;async function Be(e,t){let r=t.params,i=new URLSearchParams;for(let e of[`rm`,`stage`,`status`,`q`,`sort`])r.get(e)&&i.set(e,r.get(e));let a=await n.get(`/api/queue?${i.toString()}`),o=Math.max(1,Number(r.get(`page`)??`1`));e.root.innerHTML=Ue(a,r,o,e.session.user.role===`rm`).value,Ve(e,r,a)}function U(e,t,n){let r=new URLSearchParams(e);return n?r.set(t,n):r.delete(t),r.delete(`page`),E(`queue`,void 0,Object.fromEntries(r))}function Ve(e,t,n){let r=e.root;for(let n of r.querySelectorAll(`select[data-param]`))n.addEventListener(`change`,()=>e.go(U(t,n.dataset.param,n.value)));let i=r.querySelector(`#queue-search`),a;i.addEventListener(`input`,()=>{window.clearTimeout(a),a=window.setTimeout(()=>e.go(U(t,`q`,i.value.trim())),350)}),r.querySelector(`#reset-filters`).addEventListener(`click`,()=>e.go(E(`queue`))),r.querySelector(`#quick-filter-overdue`)?.addEventListener(`click`,()=>e.go(U(t,`status`,`overdue`))),r.querySelector(`#dismiss-guide`)?.addEventListener(`click`,e=>{e.currentTarget.closest(`[data-guide]`)?.remove()}),r.querySelector(`#export-csv`).addEventListener(`click`,()=>He(n.rows));for(let t of r.querySelectorAll(`tr[data-href]`))t.addEventListener(`click`,n=>{n.target.closest(`a,button,input,select`)||e.go(t.dataset.href)})}function He(e){let t=[`Application`,`Client`,`RM`,`Age (days)`,`Stage`,`Outstanding`,`Oldest outstanding item`,`Status`],n=e.map(e=>[e.id,e.client_name,e.rm.name,e.age_days,e.stage_label,e.outstanding_count,e.oldest_outstanding?.name??``,e.status_label].map(e=>`"${String(e).replace(/"/g,`""`)}"`).join(`,`)),r=new Blob([[t.join(`,`),...n].join(`
`)],{type:`text/csv`}),i=document.createElement(`a`);i.href=URL.createObjectURL(r),i.download=`kestrel-queue.csv`,i.click(),URL.revokeObjectURL(i.href)}function Ue(e,t,n,r){let i=e.summary,a=Math.max(1,Math.ceil(e.rows.length/H)),o=Math.min(n,a),c=e.rows.slice((o-1)*H,o*H),u=Math.max(1,...i.receipts_last_5_days),d=(i.median_wait_delta??0)<=0;return s`<div class="flex flex-col w-full space-y-space-md">
<h1 class="sr-only">Application queue</h1>
<!-- Top Metrics Strip (server-computed) -->
<section aria-label="Queue summary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
<div class="flex items-start justify-between"><div class="space-y-0.5">
<span class="font-label-default text-label-default text-on-surface-variant uppercase tracking-wider">Applications Open</span>
<div class="flex items-baseline gap-space-xs mt-1"><span class="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">${C(i.open)}</span><span class="font-label-compact text-label-compact text-on-surface-variant font-medium">active files</span></div>
</div><div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">${l(`folder_open`,`text-[20px]`)}</div></div>
<div class="mt-space-md pt-space-xs flex items-center justify-between text-on-surface-variant">
<span class="font-body-compact text-body-compact flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-primary-container" aria-hidden="true"></span>Across ${S(i.rm_count,`RM`)}</span>
<span class="font-label-compact text-label-compact text-on-surface-variant">${i.complete} complete</span>
</div></div>

<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
<div class="flex items-start justify-between"><div class="space-y-0.5">
<div class="flex items-center gap-1.5"><span class="font-label-default text-label-default text-on-surface-variant uppercase tracking-wider">Applications Overdue</span>
${i.overdue?s`<span class="px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-compact text-label-compact font-bold uppercase tracking-wider">Chasing required</span>`:``}</div>
<div class="flex items-baseline gap-space-xs mt-1"><span class="font-headline-lg text-headline-lg text-error font-bold tracking-tight">${C(i.overdue)}</span><span class="font-label-compact text-label-compact text-on-surface-variant font-medium">requiring RM action</span></div>
</div><div class="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center text-error">${l(`warning`,`text-[20px]`)}</div></div>
<div class="mt-space-md pt-space-xs flex items-center justify-between">
<button type="button" class="font-label-compact text-label-compact text-error font-semibold flex items-center gap-1 hover:underline rounded" id="quick-filter-overdue">Filter ${i.overdue} overdue ${i.overdue===1?`case`:`cases`} ${l(`arrow_forward`,`text-[14px]`)}</button>
<span class="font-label-compact text-label-compact text-on-surface-variant font-mono">${i.overdue_share_pct}% of open</span>
</div></div>

<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
<div class="flex items-start justify-between"><div class="space-y-0.5">
<span class="font-label-default text-label-default text-on-surface-variant uppercase tracking-wider">Median Waiting Time</span>
<div class="flex items-baseline gap-space-xs mt-1"><span class="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">${i.median_wait_days??`–`}</span><span class="font-label-compact text-label-compact text-on-surface-variant font-medium">days to submission (7d)</span></div>
</div>
<div class="w-16 h-8 flex items-end gap-1" role="img" aria-label="Documents received per day, last 5 days: ${i.receipts_last_5_days.join(`, `)}">
${i.receipts_last_5_days.map((e,t)=>s`<div class="w-2.5 rounded-t-sm ${t===4?`bg-primary-container`:`bg-surface-container-highest`}" style="height:${Math.max(3,Math.round(e/u*32))}px"></div>`)}
</div></div>
<div class="mt-space-md pt-space-xs flex items-center justify-between text-on-surface-variant">
${i.median_wait_delta===null?s`<span class="font-body-compact text-body-compact">Not enough receipts last week</span>`:s`<span class="font-body-compact text-body-compact flex items-center gap-1 text-on-primary-fixed-variant font-semibold">${l(d?`trending_down`:`trending_up`,`text-[14px]`)}${i.median_wait_delta>0?`+`:``}${i.median_wait_delta} days vs last week</span>`}
<span class="font-label-compact text-label-compact text-on-surface-variant">From event log</span>
</div></div>

<div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
<div class="flex items-start justify-between"><div class="space-y-0.5">
<span class="font-label-default text-label-default text-on-surface-variant uppercase tracking-wider">Draft Reminders</span>
<div class="flex items-baseline gap-space-xs mt-1"><span class="font-headline-lg text-headline-lg text-primary-container font-bold tracking-tight">${C(i.drafts_pending)}</span><span class="font-label-compact text-label-compact text-on-surface-variant font-medium">queued for RM sign-off</span></div>
</div><div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">${l(`mark_email_unread`,`text-[20px]`)}</div></div>
<div class="mt-space-md pt-space-xs flex items-center justify-between">
<span class="font-body-compact text-body-compact text-on-surface-variant flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-tertiary-container" aria-hidden="true"></span>Requires RM signature</span>
${i.analyst_requests_open?s`<span class="font-label-compact text-label-compact text-tertiary font-semibold">${S(i.analyst_requests_open,`analyst request`)}</span>`:``}
</div></div>
</section>

${r?s`<div data-guide class="bg-surface-container-low p-space-sm rounded-lg shadow-sm flex items-center justify-between">
<div class="flex items-center gap-space-sm"><div class="w-6 h-6 rounded bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0">${l(`info`)}</div>
<p class="font-body-compact text-body-compact text-on-surface"><span class="font-semibold text-primary">First-Time RM Guide:</span> Client document follow-ups require your explicit review and sign-off. Click <span class="font-semibold text-on-surface bg-surface-container-highest/60 px-1 py-0.5 rounded">Review Draft</span> on any application to inspect pending requests before anything is dispatched.</p></div>
<div class="flex items-center gap-space-xs flex-shrink-0 pl-space-md"><span class="font-label-compact text-label-compact text-on-surface-variant uppercase tracking-wider">Zero Auto-Dispatch Protocol</span>
<button type="button" id="dismiss-guide" class="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container" aria-label="Dismiss guide">${l(`close`)}</button></div>
</div>`:``}

<!-- Operational Control Bar -->
<div class="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
<div class="flex flex-wrap items-center gap-space-xs flex-1">
<div class="relative flex items-center min-w-[240px] flex-1 lg:max-w-xs">
<span class="material-symbols-outlined absolute left-2.5 text-outline text-[16px]" aria-hidden="true">search</span>
<label class="sr-only" for="queue-search">Filter by client or application ID</label>
<input class="h-8 pl-8 pr-3 w-full rounded bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-compact text-body-compact focus:bg-surface-container focus:ring-1 focus:ring-primary-container" id="queue-search" placeholder="Filter client, ID (KF-2026-XXXX)..." type="search" value="${t.get(`q`)??``}"/>
</div>
${e.filters.rms.length>1?K(`rm`,`Filter by RM`,t.get(`rm`)??``,[[``,`All RMs (${e.filters.rms.map(e=>e.name.split(` `)[0]).join(`, `)})`],...e.filters.rms.map(e=>[e.id,`${e.name} (${S(e.open,`open file`)})`])]):``}
${K(`stage`,`Filter by stage`,t.get(`stage`)??``,[[``,`All Stages`],...e.filters.stages.map(e=>[e.id,`${e.label} (${e.count})`])])}
${K(`status`,`Filter by status`,t.get(`status`)??``,[[``,`All Statuses`],[`overdue`,`Overdue`],[`due_today`,`Due today`],[`on_track`,`On track`],[`complete`,`Complete`]])}
${K(`sort`,`Sort`,t.get(`sort`)??`oldest`,[[`oldest`,`Sort: Oldest Outstanding Item First`],[`newest`,`Sort: Recently Opened`],[`overdue_first`,`Sort: Overdue Items Priority`],[`docs_desc`,`Sort: Highest Outstanding Docs`]])}
<button type="button" class="h-8 px-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-[12px] font-medium flex items-center gap-1 transition-colors" id="reset-filters">${l(`filter_alt_off`,`text-[14px]`)} Clear</button>
</div>
<div class="flex items-center gap-space-xs flex-shrink-0">
<button type="button" id="export-csv" class="h-8 px-3 rounded bg-surface-container-high text-on-surface hover:bg-surface-variant font-label-default text-label-default flex items-center gap-1.5 transition-colors">${l(`file_download`)} Export CSV</button>
</div>
</div>

<!-- Master Data Table -->
<div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
<div class="overflow-x-auto w-full">
<table class="w-full text-left text-on-surface table-fixed" style="min-width: 1200px;">
<caption class="sr-only">Applications sorted by ${t.get(`sort`)===`newest`?`most recently opened`:`oldest outstanding item`}. ${e.rows.length} rows.</caption>
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
${c.length?c.map(Ge):s`<tr><td colspan="10" class="p-space-lg text-center text-on-surface-variant">No applications match these filters.</td></tr>`}
</tbody></table></div>
<div class="px-space-md py-space-sm bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-sm">
<div class="text-on-surface-variant font-body-compact text-body-compact"><span>Showing <strong class="text-on-surface font-semibold">${e.rows.length?(o-1)*H+1:0}–${Math.min(o*H,e.rows.length)}</strong> of <strong class="text-on-surface font-semibold">${e.rows.length}</strong> applications</span></div>
<div class="flex items-center gap-space-xs text-on-surface-variant font-label-compact text-label-compact bg-surface-container-lowest/80 px-2.5 py-1 rounded">${l(`verified`,`text-[14px]`)}<span>Operational Note: No credit scores or evaluations displayed; document workflow only.</span></div>
<nav aria-label="Pagination" class="flex items-center gap-1">
${G(t,o-1,o<=1,s`${l(`chevron_left`)}<span class="sr-only">Previous page</span>`)}
${Array.from({length:a},(e,t)=>t+1).map(e=>e===o?s`<span aria-current="page" class="w-7 h-7 rounded bg-primary text-on-primary font-mono text-[12px] font-semibold flex items-center justify-center">${e}</span>`:s`<a href="${W(t,e)}" class="w-7 h-7 rounded text-on-surface-variant hover:bg-surface-container font-mono text-[12px] flex items-center justify-center">${e}</a>`)}
${G(t,o+1,o>=a,s`${l(`chevron_right`)}<span class="sr-only">Next page</span>`)}
</nav>
</div></div></div>`}function W(e,t){let n=new URLSearchParams(e);return n.set(`page`,String(t)),E(`queue`,void 0,Object.fromEntries(n))}function G(e,t,n,r){return n?s`<span class="w-7 h-7 rounded flex items-center justify-center text-outline-variant opacity-50" aria-hidden="true">${r}</span>`:s`<a href="${W(e,t)}" class="w-7 h-7 rounded flex items-center justify-center text-on-surface hover:bg-surface-container">${r}</a>`}function K(e,t,n,r){return s`<div class="relative">
<label class="sr-only" for="f-${e}">${t}</label>
<select id="f-${e}" data-param="${e}" class="h-8 pl-2 pr-7 rounded bg-surface-container-low text-on-surface font-body-compact text-body-compact focus:bg-surface-container cursor-pointer appearance-none">
${r.map(([e,t])=>s`<option value="${e}" ${e===n?c(`selected`):``}>${t}</option>`)}
</select>
<span class="material-symbols-outlined absolute right-1.5 top-2 pointer-events-none text-outline text-[16px]" aria-hidden="true">expand_more</span>
</div>`}function We(e){let t=e.next_follow_up;if(!t.at)return s`<span class="text-on-surface-variant">—</span>`;if(t.kind===`scheduled_reminder`)return s`<span class="text-on-surface-variant" title="Approved reminder scheduled">${b(t.at)}, ${y(t.at)} ${l(`schedule_send`,`text-[12px] align-middle`)}</span>`;let n=b(t.at);return e.status===`overdue`?s`<span class="text-error font-medium">${n===`Yesterday`?`Yesterday`:v(t.at)} (missed)</span>`:e.status===`due_today`?s`<span class="text-tertiary font-semibold">${n}</span>`:s`<span class="text-on-surface-variant">${n}</span>`}function Ge(e){let t=e.oldest_outstanding,n=e.status===`overdue`,r=t?se(t.status,t.days_past_due):null,i=E(`checklist`,e.id),a=e.draft?s`<a class="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded bg-primary-container text-on-primary font-label-compact text-label-compact font-semibold hover:bg-primary transition-all" href="${E(`composer`,e.id)}">Review Draft (${e.draft.items})</a>`:s`<a class="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-label-compact text-label-compact font-medium transition-colors" href="${i}">Open Checklist</a>`;return s`<tr data-href="${i}" class="h-11 hover:bg-surface-container-low/70 transition-colors group ${n?`bg-error-container/10`:``}">
<td class="pl-3 px-2 py-1 truncate"><div class="flex flex-col">
<span class="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">${e.client_name}</span>
<span class="font-label-compact text-label-compact text-on-surface-variant flex items-center gap-1">${l(`location_on`,`text-[12px]`)} ${e.city} · ${e.product}${e.open_analyst_requests?s` · <span class="text-tertiary font-semibold">Analyst request</span>`:``}</span>
</div></td>
<td class="px-2 py-1 font-mono font-tabular-data text-tabular-data font-semibold"><a class="text-primary hover:underline rounded" href="${i}">${e.id}</a></td>
<td class="px-2 py-1 truncate text-on-surface-variant font-medium">${e.rm.name}</td>
<td class="px-2 py-1 text-right font-mono font-tabular-data text-tabular-data ${n?`text-error`:`text-on-surface-variant`} font-semibold">${e.age_days}d</td>
<td class="px-2 py-1"><span class="px-2 py-0.5 rounded text-[11px] font-semibold ${ce[e.stage]}">${e.stage_label}</span></td>
<td class="px-2 py-1 text-center font-mono font-tabular-data text-tabular-data font-bold text-on-surface">${e.outstanding_count?S(e.outstanding_count,`doc`):`—`}</td>
<td class="px-2 py-1">${t?s`<div class="flex items-center gap-1.5 truncate">
<span class="w-1.5 h-1.5 rounded-full ${le[t.status]} flex-shrink-0" aria-hidden="true"></span>
<span class="truncate text-on-surface font-medium" title="${t.name}">${t.name}</span>
${r?s`<span class="px-1.5 rounded ${r.cls} text-[10px] font-bold uppercase flex-shrink-0">${r.text}</span>`:s`<span class="text-on-surface-variant text-[11px] flex-shrink-0">· ${S(t.age_days,`day`)}</span>`}
</div>`:s`<span class="text-on-surface-variant">All items received or waived</span>`}</td>
<td class="px-2 py-1 font-mono text-[11px]">${We(e)}</td>
<td class="px-2 py-1 text-center"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${ae[e.status]}">${e.status_label}</span></td>
<td class="pr-3 pl-2 py-1 text-right">${a}</td>
</tr>`}var Ke={queue:Be,checklist:R,composer:B,analyst:I,oversight:D,agents:F},q=[`bg-primary-container`,`text-on-primary`,`font-semibold`],J=[`text-outline-variant`],Y=[`bg-primary`,`text-on-primary`],X=[`text-on-surface-variant`],Z,Q=document.getElementById(`screen`);function qe(e){let t=document.getElementById(`toast`);t.textContent=e,t.classList.remove(`hidden`),window.clearTimeout(t._h),t._h=window.setTimeout(()=>t.classList.add(`hidden`),4e3)}function Je(){let e=document.getElementById(`app-header`).getBoundingClientRect().height;document.documentElement.style.setProperty(`--hdr`,`${Math.round(e)}px`)}function Ye(){document.getElementById(`user-name`).textContent=Z.user.name,document.getElementById(`user-role`).textContent=`${Z.user.role_label} View`;for(let e of document.querySelectorAll(`[data-screen]`))e.classList.toggle(`hidden`,!Z.screens.includes(e.dataset.screen));document.getElementById(`role-dialog-title`).textContent=`Your access`,document.getElementById(`role-help`).textContent=`Signed in as ${Z.user.name}, ${Z.user.role_label}. To use another role, sign out and sign in as that person. The server enforces these permissions on every request.`;let e=Z.screens.includes(`queue`);document.getElementById(`header-search`).classList.toggle(`md:flex`,e);let t=document.getElementById(`role-list`);t.innerHTML=s`<div class="p-space-sm rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-between gap-space-sm">
<span class="font-label-default text-label-default">${Z.user.name}</span>
<span class="font-label-compact text-label-compact">${Z.user.role_label}</span></div>
<p class="font-label-compact text-label-compact uppercase text-on-surface-variant mt-space-xs">Your permissions</p>
<ul class="flex flex-wrap gap-1">${Z.permissions.map(e=>s`<li class="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-compact text-label-compact">${e}</li>`)}</ul>`.value}function Xe(e){for(let t of document.querySelectorAll(`.nav-top`)){let n=t.dataset.screen===e;t.classList.remove(...n?J:q),t.classList.add(...n?q:J),n?t.setAttribute(`aria-current`,`page`):t.removeAttribute(`aria-current`)}for(let t of document.querySelectorAll(`.nav-side`)){let n=t.dataset.screen===e;t.classList.remove(...n?X:Y),t.classList.add(...n?Y:X),n?t.setAttribute(`aria-current`,`page`):t.removeAttribute(`aria-current`)}}function Ze(){return Z.screens[0]??`queue`}async function $(){let t=ie(window.location.hash);if(!t||!Z.screens.includes(t.screen)){window.location.replace(`#/${Ze()}`);return}Xe(t.screen),Q.innerHTML=s`<p class="p-space-lg text-on-surface-variant font-body-compact text-body-compact">Loading…</p>`.value;let n={session:Z,root:Q,toast:qe,go:e=>window.location.assign(e)};try{await Ke[t.screen](n,t),document.title=`${Qe(t.screen)} · Kestrel (prototype)`}catch(t){Q.innerHTML=s`<div role="alert" class="m-space-lg p-space-md rounded-lg bg-error-container text-on-error-container font-body-default text-body-default">${t instanceof e?t.message:`Something went wrong loading this screen.`}</div>`.value}}function Qe(e){return{queue:`Application Queue`,checklist:`Checklist & Timeline`,composer:`Reminder Composer`,analyst:`Analyst File View`,oversight:`Oversight & Audit`,agents:Z.screens.includes(`agents`)&&Z.user.role===`finance`?`AI Cost & Governance`:`AI Agent Workbench`}[e]}async function $e(){Z=await n.get(`/api/session`),Ye(),Je(),new ResizeObserver(Je).observe(document.getElementById(`app-header`));let e=document.getElementById(`role-dialog`),t=()=>e.showModal();document.getElementById(`user-button`).addEventListener(`click`,t),document.getElementById(`role-switch-side`).addEventListener(`click`,t),e.querySelector(`[data-close]`).addEventListener(`click`,()=>e.close()),document.getElementById(`show-rbac`).addEventListener(`click`,async()=>{let e=document.getElementById(`rbac-box`);e.innerHTML=e.innerHTML?``:d(await u()).value}),document.getElementById(`protocol-dismiss`).addEventListener(`click`,()=>{document.getElementById(`protocol-strip`).hidden=!0}),document.getElementById(`header-search`).addEventListener(`submit`,e=>{e.preventDefault();let t=document.getElementById(`header-search-input`).value.trim();window.location.hash=`#/queue?q=${encodeURIComponent(t)}`}),window.addEventListener(`hashchange`,()=>void $()),await $()}$e();