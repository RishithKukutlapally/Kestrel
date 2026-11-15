/** Minimal HTML templating with automatic escaping. Values are escaped unless wrapped in
 *  `raw()` or produced by another `html` template. Arrays are joined. */

export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

type Value = SafeHtml | string | number | boolean | null | undefined | Value[];

function render(v: Value): string {
  if (v === null || v === undefined || v === false) return "";
  if (Array.isArray(v)) return v.map(render).join("");
  if (v instanceof SafeHtml) return v.value;
  return escapeHtml(String(v));
}

export function html(strings: TemplateStringsArray, ...values: Value[]): SafeHtml {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return new SafeHtml(out);
}

export function raw(s: string): SafeHtml {
  return new SafeHtml(s);
}

/** Decorative Material Symbols icon, hidden from assistive tech. */
export function icon(name: string, cls = "text-[16px]"): SafeHtml {
  return html`<span class="material-symbols-outlined ${cls}" aria-hidden="true">${name}</span>`;
}
