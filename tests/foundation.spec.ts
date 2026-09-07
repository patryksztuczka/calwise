import { expect, test } from "@playwright/test";

test("visitor sees the greeting stored in D1 through the Worker API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hello, world!" })).toBeVisible();
  await expect(page.getByText("Connected to Cloudflare D1")).toBeVisible();
});

test("visitor sees a loading state while the API is pending", async ({ page }) => {
  const { promise: pending, resolve: release } = Promise.withResolvers<void>();
  await page.route("**/trpc/**", async (route) => {
    await pending;
    await route.continue();
  });
  await page.goto("/");
  try {
    await expect(page.getByRole("status")).toHaveText("Connecting...");
  } finally {
    release();
  }
  await expect(page.getByRole("heading", { name: "Hello, world!" })).toBeVisible();
});

test("visitor sees an error when the API cannot be reached", async ({ page }) => {
  await page.route("**/trpc/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toHaveText(
    "Couldn't connect to the API. Please try again later.",
  );
});

test("public API exposes health and allows the production frontend origin", async ({ request }) => {
  const health = await request.get("http://localhost:8787/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  const greeting = await request.get("http://localhost:8787/trpc/greeting", {
    headers: { Origin: "https://calwise.lastlab.win" },
  });
  expect(greeting.status()).toBe(200);
  expect(greeting.headers()["access-control-allow-origin"]).toBe("https://calwise.lastlab.win");
  expect(await greeting.json()).toEqual({
    result: { data: { message: "Hello, world!", database: "D1" } },
  });
});

test("API reports an unavailable database without exposing SQL errors", async ({ request }) => {
  const response = await request.get("http://localhost:8788/trpc/greeting");
  expect(response.status()).toBe(500);
  expect(await response.json()).toMatchObject({
    error: { message: "Database unavailable", data: { code: "INTERNAL_SERVER_ERROR" } },
  });
  expect(await response.text()).not.toContain("no such table");
  expect(await response.text()).not.toContain('"stack"');
});

test("greeting cannot be changed through the public API", async ({ request }) => {
  const response = await request.post("http://localhost:8787/trpc/greeting", {
    data: { message: "Changed" },
  });
  expect(response.status()).toBe(405);
});
