import { expect, test } from "@playwright/test";

const greetingRequest = "**/trpc/greeting.current*";

test("renders the greeting seeded in D1", async ({ page }) => {
  await page.goto("/greeting");
  await expect(page.getByRole("heading", { name: "Hello World" })).toBeVisible();
  await expect(page.getByTestId("greeting")).toHaveText("Hello from Calwise");
  await expect(page.getByTestId("greeting-error")).toHaveCount(0);
});

test("shows the loading state while the Worker responds", async ({ page }) => {
  await page.route(greetingRequest, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto("/greeting");
  await expect(page.getByTestId("greeting-loading")).toBeVisible();
  await expect(page.getByTestId("greeting")).toHaveText("Hello from Calwise");
  await expect(page.getByTestId("greeting-loading")).toHaveCount(0);
});

test("shows the error state when the Worker is unreachable", async ({ page }) => {
  await page.route(greetingRequest, (route) => route.abort("connectionrefused"));
  await page.goto("/greeting");
  await expect(page.getByTestId("greeting-error")).toContainText("Could not load the greeting");
  await expect(page.getByTestId("greeting")).toHaveCount(0);
});
