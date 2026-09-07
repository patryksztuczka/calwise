import { defineConfig } from "@playwright/test";

// End-to-end check of browser → Worker → D1, all emulated locally:
// wrangler dev serves the Worker with a migrated local D1, and the web
// build points at it through VITE_API_URL so the CORS path is exercised too.
const apiUrl = "http://localhost:8787";
const webUrl = "http://localhost:4173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: webUrl, trace: "retain-on-failure" },
  webServer: [
    {
      command: "pnpm db:migrate:local && pnpm dev",
      cwd: "../api",
      url: `${apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `VITE_API_URL=${apiUrl} pnpm build && pnpm preview --strictPort`,
      url: webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
