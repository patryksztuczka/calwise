import { expect, test } from "@playwright/test";

test("opens on the Today overview built from the mocked daily log", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
  await expect(page.getByText("KCAL EATEN", { exact: true })).toBeVisible();
  await expect(page.getByText("1,450", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "550 kcal left" })).toBeVisible();
  await expect(page.getByText("3 logged")).toBeVisible();
  await expect(page.getByRole("link", { name: "LOG FOOD" })).toBeVisible();
});

test("keeps the tab bar on placeholder screens and links back to Today", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Diary" }).click();
  await expect(page.getByRole("heading", { name: "DIARY" })).toBeVisible();
  await page.getByRole("link", { name: "BACK TO TODAY" }).click();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
});
