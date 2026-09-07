import { expect, test } from "@playwright/test";

// Today needs a signed-in user; each test creates a throwaway account first.
test.beforeEach(async ({ page }) => {
  await page.goto("/sign-up");
  await page
    .getByLabel("Email")
    .fill(`today-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`);
  await page.getByRole("textbox", { name: "Password" }).fill("correct horse battery");
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
});

test("opens on the Today overview built from the mocked daily log", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
  await expect(page.getByText("KCAL EATEN", { exact: true })).toBeVisible();
  await expect(page.getByText("1,450", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "550 kcal left" })).toBeVisible();
  await expect(page.getByText("3 logged")).toBeVisible();
  await expect(page.getByRole("link", { name: "LOG FOOD" })).toBeVisible();
});

test("keeps the tab bar on placeholder screens and links back to Today", async ({ page }) => {
  await page.getByRole("link", { name: "Diary" }).click();
  await expect(page.getByRole("heading", { name: "DIARY" })).toBeVisible();
  await page.getByRole("link", { name: "BACK TO TODAY" }).click();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
});
