import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: { baseURL: "http://localhost:4173" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        "node tools/prepare-test-db.ts && pnpm --filter @calwise/api exec wrangler dev --local --port 8787 --persist-to .wrangler-test",
      url: "http://localhost:8787/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @calwise/api exec wrangler dev --local --port 8788 --inspector-port 9230 --persist-to .wrangler-test/empty",
      url: "http://localhost:8788/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @calwise/web exec vp dev --port 4173 --strictPort",
      url: "http://localhost:4173",
      reuseExistingServer: false,
    },
  ],
});
