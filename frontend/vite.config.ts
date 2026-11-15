import { resolve } from "node:path";
import { defineConfig } from "vite";

// Two static pages; FastAPI serves dist/ from the same origin.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: { index: resolve(import.meta.dirname, "index.html"), login: resolve(import.meta.dirname, "login.html") },
    },
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:8000", "/auth": "http://127.0.0.1:8000", "/healthz": "http://127.0.0.1:8000" },
  },
  test: { environment: "jsdom", include: ["tests/**/*.test.ts"] },
});
