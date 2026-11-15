import { expect, test, type Page } from "@playwright/test";

// Smoke test of the running app. DEMO_PASSWORD_TEMPLATE must match the server's, e.g. "{Name}@YourSuffix".
const TEMPLATE = process.env.DEMO_PASSWORD_TEMPLATE ?? "";

function password(first: string): string {
  return TEMPLATE.replace("{Name}", first).replace("{name}", first.toLowerCase());
}

async function signIn(page: Page, first: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await expect(page.getByText("Prototype. Synthetic data only.")).toBeVisible();
  await page.getByRole("textbox", { name: "Username" }).fill(first.toLowerCase());
  await page.getByLabel("Password").fill(password(first));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("#user-name")).not.toHaveText("…");
  await expect(page.locator("#screen")).not.toContainText("Loading…");
}

test("rejects a wrong password", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Username" }).fill("vikram");
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("not correct");
});

test("each person lands on their own screens", async ({ page }) => {
  test.skip(!TEMPLATE, "set DEMO_PASSWORD_TEMPLATE");

  await signIn(page, "Sunita");
  await page.goto("/#/queue");
  await expect(page.getByRole("table")).toContainText("KF-2026-");
  await page.goto("/#/checklist/KF-2026-1049");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Quillstone");
  await expect(page.getByText("What is blocking this file")).toBeVisible();

  await signIn(page, "Vikram");
  await page.goto("/#/composer/KF-2026-1049");
  await expect(page.getByText(/Draft for RM review \(not sent\)|Approved/)).toBeVisible();

  await signIn(page, "Ananya");
  await expect(page.getByText(/STATUS: (BLOCKED|COMPLETE)/)).toBeVisible();
  await page.goto("/#/queue"); // not allowed for an analyst: bounced to her own screen
  await expect(page.getByText(/STATUS: (BLOCKED|COMPLETE)/)).toBeVisible();

  await signIn(page, "Rahul");
  await expect(page.getByRole("heading", { name: "AI Agent Governance" })).toBeVisible();
  await expect(page.getByText(/Hash chain: verified/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Quillstone");

  // "Your access" shows the person's role, permissions and the RBAC matrix; no switching.
  await page.locator("#role-switch-side").click();
  await expect(page.locator("#role-list")).toContainText("audit.view");
  await page.getByRole("button", { name: /Show access-control matrix/ }).click();
  await expect(page.locator("#rbac-box")).toContainText("agents.edit_behaviour");
});

test("document-chase agent runs and shows its trace", async ({ page }) => {
  test.skip(!TEMPLATE, "set DEMO_PASSWORD_TEMPLATE");
  await signIn(page, "Vikram");
  await page.goto("/#/composer/KF-2026-1203");
  await page.getByRole("button", { name: /Run document-chase agent/ }).click();
  await expect(page.getByRole("region", { name: "Document-chase agent run" })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("#composer-trace")).toContainText("Hand-off: held for the named RM");
  await expect(page.locator("#composer-trace")).toContainText("data minimisation");
});

test("AI Agent Owner can run and change agents, nothing else", async ({ page }) => {
  test.skip(!TEMPLATE, "set DEMO_PASSWORD_TEMPLATE");
  await signIn(page, "Dev");
  await expect(page.locator("#user-name")).toHaveText("Dev Raman");
  await expect(page.getByRole("heading", { name: "AI Agent Workbench" })).toBeVisible();
  await expect(page.getByText("Cost incurred until now")).toBeVisible();
  await page.getByRole("button", { name: "Run with this prompt" }).click();
  await expect(page.getByRole("region", { name: "Trace of this run" })).toBeVisible({ timeout: 60_000 });
  await page.goto("/#/queue");
  await expect(page.getByRole("heading", { name: "AI Agent Workbench" })).toBeVisible();
});

test("CFO Office sees AI cost so far, read-only", async ({ page }) => {
  test.skip(!TEMPLATE, "set DEMO_PASSWORD_TEMPLATE");
  await signIn(page, "Kavya");
  await expect(page.getByRole("heading", { name: "AI Cost & Governance" })).toBeVisible();
  await expect(page.getByText("Cost incurred until now")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run with this prompt" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Quillstone");
});
