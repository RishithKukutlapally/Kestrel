/** Status chips: every status pairs a text label with colour (never colour alone).
 *  Class strings are the ones used for the same states in the Stitch screens. */

export type ItemStatus = "on_track" | "due_today" | "overdue" | "received" | "waived";
export type FileStatus = "on_track" | "due_today" | "overdue" | "complete";
export type Stage = "doc_collection" | "analyst_blocked" | "complete";

export const STATUS_LABEL: Record<ItemStatus | FileStatus, string> = {
  on_track: "On track",
  due_today: "Due today",
  overdue: "Overdue",
  received: "Received",
  waived: "Waived",
  complete: "Complete",
};

/** Queue "Status" column pill (application_queue_1). */
export const FILE_CHIP: Record<FileStatus, string> = {
  overdue: "bg-error-container text-on-error-container",
  due_today: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  on_track: "bg-surface-container-high text-on-surface font-semibold",
  complete: "bg-secondary-container text-on-secondary-fixed font-semibold",
};

/** Checklist item pill (application_checklist_timeline_1). */
export const ITEM_CHIP: Record<ItemStatus, string> = {
  overdue: "bg-error text-on-error",
  due_today: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  on_track: "bg-surface-container-high text-on-tertiary-fixed-variant",
  received: "bg-surface-container-high text-primary",
  waived: "bg-surface-container-high text-on-surface-variant",
};

/** Small inline flag next to the oldest outstanding item in the queue. */
export function oldestFlag(status: ItemStatus, daysPastDue: number): { text: string; cls: string } | null {
  if (status === "overdue") return { text: `${daysPastDue}d overdue`, cls: "bg-error-container text-on-error-container" };
  if (status === "due_today") return { text: "Due today", cls: "bg-tertiary-fixed text-on-tertiary-fixed-variant" };
  return null;
}

export const STAGE_CHIP: Record<Stage, string> = {
  analyst_blocked: "bg-tertiary-container/15 text-tertiary",
  doc_collection: "bg-surface-container-high text-on-surface",
  complete: "bg-secondary-container text-on-secondary-fixed",
};

export const DOT: Record<ItemStatus, string> = {
  overdue: "bg-error",
  due_today: "bg-tertiary",
  on_track: "bg-outline",
  received: "bg-primary",
  waived: "bg-outline-variant",
};

export const EVENT_CHIP: Record<string, string> = {
  request_created: "bg-surface-container text-secondary",
  reminder_drafted: "bg-surface-container-high text-on-surface-variant",
  reminder_approved: "bg-secondary-container text-on-secondary-fixed",
  reminder_sent: "bg-primary-fixed text-on-primary-fixed",
  document_received: "bg-surface-container-highest text-primary",
  item_waived: "bg-surface-container-high text-on-surface-variant",
  file_marked_complete: "bg-secondary-container text-on-secondary-fixed",
};

export const EVENT_TYPES: [string, string][] = [
  ["request_created", "Request Created"],
  ["reminder_drafted", "Reminder Drafted"],
  ["reminder_approved", "Reminder Approved"],
  ["reminder_sent", "Reminder Sent"],
  ["document_received", "Document Received"],
  ["item_waived", "Item Waived"],
  ["file_marked_complete", "File Marked Complete"],
];

/** Sort key used by the queue when re-sorting client-side (matches the server's "oldest"). */
export function oldestFirst<T extends { status: FileStatus; oldest_outstanding: { age_days: number } | null; id: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const ac = a.status === "complete" ? 1 : 0;
    const bc = b.status === "complete" ? 1 : 0;
    if (ac !== bc) return ac - bc;
    const aa = a.oldest_outstanding?.age_days ?? -1;
    const ba = b.oldest_outstanding?.age_days ?? -1;
    return ba - aa || a.id.localeCompare(b.id);
  });
}
