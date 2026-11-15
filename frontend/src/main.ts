import "./styles.css";

import { api, ApiError, type SessionInfo } from "./api";
import { html } from "./html";
import { renderAgents } from "./screens/agents";
import { renderAnalyst } from "./screens/analyst";
import { loadRbac, rbacTable } from "./rbac";
import { renderChecklist } from "./screens/checklist";
import { renderComposer } from "./screens/composer";
import { renderOversight } from "./screens/oversight";
import { renderQueue } from "./screens/queue";
import { parseRoute, type Route } from "./router";

export interface Ctx {
  session: SessionInfo;
  root: HTMLElement;
  toast: (msg: string) => void;
  go: (hash: string) => void;
}

const SCREEN_RENDERERS: Record<Route["screen"], (ctx: Ctx, route: Route) => Promise<void>> = {
  queue: renderQueue,
  checklist: renderChecklist,
  composer: renderComposer,
  analyst: renderAnalyst,
  oversight: renderOversight,
  agents: renderAgents,
};

const ACTIVE_TOP = ["bg-primary-container", "text-on-primary", "font-semibold"];
const IDLE_TOP = ["text-outline-variant"];
const ACTIVE_SIDE = ["bg-primary", "text-on-primary"];
const IDLE_SIDE = ["text-on-surface-variant"];

let session: SessionInfo;
const root = document.getElementById("screen")!;

function toast(msg: string): void {
  const t = document.getElementById("toast")!;
  t.textContent = msg;
  t.classList.remove("hidden");
  window.clearTimeout((t as HTMLElement & { _h?: number })._h);
  (t as HTMLElement & { _h?: number })._h = window.setTimeout(() => t.classList.add("hidden"), 4000);
}

function measureHeader(): void {
  const h = document.getElementById("app-header")!.getBoundingClientRect().height;
  document.documentElement.style.setProperty("--hdr", `${Math.round(h)}px`);
}

function applyShell(): void {
  document.getElementById("user-name")!.textContent = session.user.name;
  document.getElementById("user-role")!.textContent = `${session.user.role_label} View`;
  for (const a of document.querySelectorAll<HTMLAnchorElement>("[data-screen]")) {
    a.classList.toggle("hidden", !session.screens.includes(a.dataset.screen!));
  }
  // Every session belongs to one person. The dialog shows their access; there is no switching.
  document.getElementById("role-dialog-title")!.textContent = "Your access";
  document.getElementById("role-help")!.textContent =
    `Signed in as ${session.user.name}, ${session.user.role_label}. To use another role, sign out and sign in as that person. The server enforces these permissions on every request.`;
  const canSearch = session.screens.includes("queue");
  document.getElementById("header-search")!.classList.toggle("md:flex", canSearch);

  const list = document.getElementById("role-list")!;
  list.innerHTML = html`<div class="p-space-sm rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-between gap-space-sm">
<span class="font-label-default text-label-default">${session.user.name}</span>
<span class="font-label-compact text-label-compact">${session.user.role_label}</span></div>
<p class="font-label-compact text-label-compact uppercase text-on-surface-variant mt-space-xs">Your permissions</p>
<ul class="flex flex-wrap gap-1">${session.permissions.map((p) => html`<li class="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-compact text-label-compact">${p}</li>`)}</ul>`.value;
}

function setActiveNav(screen: string): void {
  for (const a of document.querySelectorAll<HTMLAnchorElement>(".nav-top")) {
    const on = a.dataset.screen === screen;
    a.classList.remove(...(on ? IDLE_TOP : ACTIVE_TOP));
    a.classList.add(...(on ? ACTIVE_TOP : IDLE_TOP));
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  for (const a of document.querySelectorAll<HTMLAnchorElement>(".nav-side")) {
    const on = a.dataset.screen === screen;
    a.classList.remove(...(on ? IDLE_SIDE : ACTIVE_SIDE));
    a.classList.add(...(on ? ACTIVE_SIDE : IDLE_SIDE));
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}

function defaultScreen(): string {
  return session.screens[0] ?? "queue";
}

async function route(): Promise<void> {
  const r = parseRoute(window.location.hash);
  if (!r || !session.screens.includes(r.screen)) {
    window.location.replace(`#/${defaultScreen()}`);
    return;
  }
  setActiveNav(r.screen);
  root.innerHTML = html`<p class="p-space-lg text-on-surface-variant font-body-compact text-body-compact">Loading…</p>`.value;
  const ctx: Ctx = { session, root, toast, go: (h) => window.location.assign(h) };
  try {
    await SCREEN_RENDERERS[r.screen](ctx, r);
    document.title = `${titleFor(r.screen)} · Kestrel (prototype)`;
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : "Something went wrong loading this screen.";
    root.innerHTML = html`<div role="alert" class="m-space-lg p-space-md rounded-lg bg-error-container text-on-error-container font-body-default text-body-default">${msg}</div>`.value;
  }
}

function titleFor(screen: string): string {
  return (
    {
      queue: "Application Queue",
      checklist: "Checklist & Timeline",
      composer: "Reminder Composer",
      analyst: "Analyst File View",
      oversight: "Oversight & Audit",
      agents: session.screens.includes("agents") && session.user.role === "finance" ? "AI Cost & Governance" : "AI Agent Workbench",
    } as Record<string, string>
  )[screen]!;
}

async function boot(): Promise<void> {
  session = await api.get<SessionInfo>("/api/session");
  applyShell();
  measureHeader();
  new ResizeObserver(measureHeader).observe(document.getElementById("app-header")!);

  const dialog = document.getElementById("role-dialog") as HTMLDialogElement;
  const open = () => dialog.showModal();
  document.getElementById("user-button")!.addEventListener("click", open);
  document.getElementById("role-switch-side")!.addEventListener("click", open);
  dialog.querySelector("[data-close]")!.addEventListener("click", () => dialog.close());
  document.getElementById("show-rbac")!.addEventListener("click", async () => {
    const box = document.getElementById("rbac-box")!;
    if (box.innerHTML) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML = rbacTable(await loadRbac()).value;
  });

  document.getElementById("protocol-dismiss")!.addEventListener("click", () => {
    document.getElementById("protocol-strip")!.hidden = true;
  });
  document.getElementById("header-search")!.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (document.getElementById("header-search-input") as HTMLInputElement).value.trim();
    window.location.hash = `#/queue?q=${encodeURIComponent(q)}`;
  });

  window.addEventListener("hashchange", () => void route());
  await route();
}

void boot();
