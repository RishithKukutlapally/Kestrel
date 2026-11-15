import { describe, expect, it } from "vitest";
import { dayMonthYear, relativeDay, time12 } from "../src/format";
import { escapeHtml, html, raw } from "../src/html";
import { link, parseRoute } from "../src/router";
import { FILE_CHIP, oldestFirst, oldestFlag, STATUS_LABEL } from "../src/status";

describe("html escaping", () => {
  it("escapes interpolated values", () => {
    expect(html`<p>${'<img src=x onerror="a">'}</p>`.value).toBe("<p>&lt;img src=x onerror=&quot;a&quot;&gt;</p>");
  });
  it("keeps raw and nested templates", () => {
    expect(html`<b>${raw("&amp;")}${html`<i>${"x"}</i>`}</b>`.value).toBe("<b>&amp;<i>x</i></b>");
    expect(escapeHtml("'")).toBe("&#39;");
  });
});

describe("IST formatting", () => {
  const now = new Date("2026-11-12T06:30:00Z"); // 12 Nov, 12:00 IST
  it("labels relative days in IST", () => {
    expect(relativeDay("2026-11-12", now)).toBe("Today");
    expect(relativeDay("2026-11-13", now)).toBe("Tomorrow");
    expect(relativeDay("2026-11-11", now)).toBe("Yesterday");
    expect(relativeDay("2026-11-20", now)).toBe("20 Nov 2026");
    expect(relativeDay("2026-11-12T19:00:00Z", now)).toBe("Tomorrow"); // 00:30 IST on the 13th
  });
  it("formats times in IST", () => {
    expect(time12("2026-11-12T04:30:00Z")).toBe("10:00 AM");
    expect(dayMonthYear("2026-02-05")).toBe("05 Feb 2026");
  });
});

describe("routing", () => {
  it("parses screens and application IDs", () => {
    expect(parseRoute("#/checklist/KF-2026-1049")).toMatchObject({ screen: "checklist", id: "KF-2026-1049" });
    expect(parseRoute("#/queue?status=overdue")!.params.get("status")).toBe("overdue");
    expect(parseRoute("#/composer/<script>")!.id).toBeNull();
    expect(parseRoute("#/admin")).toBeNull();
    expect(link("queue", undefined, { q: "a b", rm: "" })).toBe("#/queue?q=a+b");
  });
});

describe("status chips", () => {
  it("every status has a text label and a colour class", () => {
    for (const s of ["on_track", "due_today", "overdue", "complete"] as const) {
      expect(STATUS_LABEL[s]).toMatch(/\w/);
      expect(FILE_CHIP[s]).toMatch(/bg-/);
    }
  });
  it("flags overdue and due-today items", () => {
    expect(oldestFlag("overdue", 3)!.text).toBe("3d overdue");
    expect(oldestFlag("due_today", 0)!.text).toBe("Due today");
    expect(oldestFlag("on_track", 0)).toBeNull();
  });
  it("sorts by oldest outstanding item, complete last", () => {
    const rows = [
      { id: "A", status: "complete" as const, oldest_outstanding: null },
      { id: "B", status: "on_track" as const, oldest_outstanding: { age_days: 2 } },
      { id: "C", status: "overdue" as const, oldest_outstanding: { age_days: 9 } },
    ];
    expect(oldestFirst(rows).map((r) => r.id)).toEqual(["C", "B", "A"]);
  });
});
