/** Hash routes. The Stitch links (#/queue, #/checklist, …) keep working; an application ID
 *  may follow: #/checklist/KF-2026-1049. Query parameters carry queue filters. */

export type ScreenName = "queue" | "checklist" | "composer" | "analyst" | "oversight" | "agents";

export interface Route {
  screen: ScreenName;
  id: string | null;
  params: URLSearchParams;
}

const SCREENS: ScreenName[] = ["queue", "checklist", "composer", "analyst", "oversight", "agents"];
const APP_ID = /^KF-2026-\d{4}$/;

export function parseRoute(hash: string): Route | null {
  const h = hash.replace(/^#\/?/, "");
  const [path, query = ""] = h.split("?", 2);
  const [screen, id] = path.split("/");
  if (!SCREENS.includes(screen as ScreenName)) return null;
  const cleanId = id && APP_ID.test(decodeURIComponent(id)) ? decodeURIComponent(id) : null;
  return { screen: screen as ScreenName, id: cleanId, params: new URLSearchParams(query) };
}

export function link(screen: ScreenName, id?: string, params?: Record<string, string>): string {
  const q = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : "";
  return `#/${screen}${id ? `/${id}` : ""}${q ? `?${q}` : ""}`;
}
