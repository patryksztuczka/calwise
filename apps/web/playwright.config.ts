import { defineConfig } from "@playwright/test";

import { apiUrl } from "./e2e/urls.ts";

// This suite covers browser flows and direct API integration against local D1.
// wrangler serves the Worker with migrated, seeded databases; the web build
// uses VITE_API_URL to exercise CORS on browser requests.
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
      command: "pnpm e2e:serve",
      cwd: "../api",
      url: `${apiUrl}/health`,
      // A dev server may use different D1 state. Require our seeded e2e instance.
      reuseExistingServer: false,
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
