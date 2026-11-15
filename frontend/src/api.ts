/** Thin fetch wrapper. Same origin; the session cookie is HttpOnly and sent automatically. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    window.location.assign("/login");
    throw new ApiError(401, "login required");
  }
  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
  if (!res.ok) {
    const detail = data && typeof data.detail === "string" ? data.detail : `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
};

// ---------------------------------------------------------------- response types
import type { FileStatus, ItemStatus, Stage } from "./status";

export interface DemoUser {
  id: string;
  name: string;
  role: string;
  role_label: string;
}
export interface SessionInfo {
  user: { id: string; name: string; role: string; title: string; role_label: string };
  screens: string[];
  demo_users: DemoUser[];
  ai_drafting_enabled: boolean;
  version: string;
  locked: boolean;
  permissions: string[];
}

export interface Item {
  id: number;
  name: string;
  category: string;
  owner: string;
  state: "requested" | "received" | "waived";
  status: ItemStatus;
  status_label: string;
  round: number;
  requested_on: string;
  due_date: string;
  days_past_due: number;
  age_days: number;
  received_at: string | null;
  received_by: string | null;
  waived_reason: string | null;
  waived_by: string | null;
  analyst_request_id: number | null;
}

export interface AppSummary {
  id: string;
  client_name: string;
  city: string;
  product: string;
  applicant_type: string;
  loan_band: string;
  rm: { id: string; name: string };
  analyst: { id: string; name: string } | null;
  opened_on: string;
  age_days: number;
  status: FileStatus;
  status_label: string;
  stage: Stage;
  stage_label: string;
  items_total: number;
  items_done: number;
  outstanding_count: number;
  overdue_count: number;
  due_today_count: number;
  oldest_outstanding: Item | null;
  next_follow_up: { kind: "scheduled_reminder" | "due_date" | null; at: string | null };
  draft: { id: number; items: number } | null;
  open_analyst_requests: number;
}

export interface QueueResponse {
  summary: {
    open: number;
    complete: number;
    rm_count: number;
    overdue: number;
    overdue_share_pct: number;
    median_wait_days: number | null;
    median_wait_delta: number | null;
    receipts_last_5_days: number[];
    drafts_pending: number;
    analyst_requests_open: number;
  };
  filters: {
    rms: { id: string; name: string; open: number }[];
    stages: { id: Stage; label: string; count: number }[];
  };
  rows: AppSummary[];
}

export interface TimelineEvent {
  id: number;
  occurred_at: string;
  event_type: string;
  event_label: string;
  actor_name: string;
  actor_role: string;
  actor_role_label: string;
  reason: string;
  kind: string | null;
  hash: string;
  application_id?: string | null;
}

export interface Group {
  name: string;
  items: Item[];
  done: number;
  total: number;
  overdue: number;
  max_round: number;
}

export interface AppDetail extends AppSummary {
  contact_name: string;
  groups: Group[];
  blocking: Item[];
  analyst_requests: { id: number; analyst: string; note: string; created_at: string; item_ids: number[] }[];
  reminders?: { id: number; state: string; round: number; scheduled_for: string | null; sent_at: string | null }[];
  timeline: TimelineEvent[];
  permissions: { mark_received: boolean; waive: boolean; draft_reminder: boolean };
}

export interface ReminderView {
  id: number;
  application_id: string;
  client_name: string;
  contact_name: string;
  contact_email: string;
  product: string;
  named_rm: { id: string; name: string };
  state: "draft" | "scheduled" | "sent";
  round: number;
  round_labels: Record<string, string>;
  due_date: string;
  due_label: string;
  item_ids: number[];
  outstanding_items: Item[];
  items_total: number;
  body: string;
  edited_text: boolean;
  ai_assisted: boolean;
  revision: number;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
}

export interface AnalystDetail extends Omit<AppDetail, "timeline" | "reminders" | "permissions"> {
  receipt_log: TimelineEvent[];
  received_items: Item[];
  readiness: "complete" | "blocked";
}

export interface Oversight {
  active_files: number;
  complete_files: number;
  files_with_overdue_items: number;
  overdue_share_pct: number;
  ageing_buckets: Record<"0-3" | "4-7" | "8-14" | "15+", number>;
  critical_stall_count: number;
  stages: Record<Stage, number>;
  reminders_sent_30d: number;
  reminders_approved_30d: number;
  sent_without_named_rm_approval: number;
  approved_without_edits_pct: number | null;
  avg_turnaround_days: number | null;
  total_events: number;
}

export interface AuditPage {
  total: number;
  offset: number;
  limit: number;
  events: TimelineEvent[];
}
