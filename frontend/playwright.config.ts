import { defineConfig } from "@playwright/test";

// Smoke test against a running app (local uvicorn or the deployed URL).
// BASE_URL defaults to local; APP_ACCESS_CODE must match the server's code.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: { baseURL: process.env.BASE_URL ?? "http://127.0.0.1:8000", screenshot: "only-on-failure" },
  reporter: [["list"]],
});
