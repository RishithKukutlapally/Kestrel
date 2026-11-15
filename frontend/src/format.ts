/** Date formatting in IST (Asia/Kolkata, UTC+05:30, no DST). */

const IST_OFFSET_MIN = 330;

function istParts(d: Date): { y: number; m: number; day: number; h: number; min: number } {
  const t = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), day: t.getUTCDate(), h: t.getUTCHours(), min: t.getUTCMinutes() };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function istDateKey(d: Date): string {
  const p = istParts(d);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function parseDay(iso: string): Date {
  // "YYYY-MM-DD" -> midday UTC so it maps to the same calendar day in IST.
  return new Date(`${iso}T06:30:00Z`);
}

export function dayMonth(iso: string): string {
  const p = istParts(iso.length === 10 ? parseDay(iso) : new Date(iso));
  return `${String(p.day).padStart(2, "0")} ${MONTHS[p.m]}`;
}

export function dayMonthYear(iso: string): string {
  const p = istParts(iso.length === 10 ? parseDay(iso) : new Date(iso));
  return `${String(p.day).padStart(2, "0")} ${MONTHS[p.m]} ${p.y}`;
}

export function time12(iso: string): string {
  const p = istParts(new Date(iso));
  const ampm = p.h >= 12 ? "PM" : "AM";
  const h = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${String(h).padStart(2, "0")}:${String(p.min).padStart(2, "0")} ${ampm}`;
}

/** "Today", "Tomorrow", "Yesterday" or "12 Nov 2026" relative to `now` (IST days). */
export function relativeDay(iso: string, now: Date = new Date()): string {
  const target = iso.length === 10 ? iso : istDateKey(new Date(iso));
  const today = istDateKey(now);
  const diff = Math.round((parseDay(target).getTime() - parseDay(today).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return dayMonthYear(target);
}

export function timestamp(iso: string, now: Date = new Date()): string {
  const rel = relativeDay(iso, now);
  const short = rel === "Today" || rel === "Yesterday" || rel === "Tomorrow" ? rel : dayMonth(iso);
  return `${short}, ${time12(iso)}`;
}

export function auditTimestamp(iso: string): string {
  const p = istParts(new Date(iso));
  const sec = new Date(iso).getUTCSeconds();
  return `${dayMonthYear(iso)}, ${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
