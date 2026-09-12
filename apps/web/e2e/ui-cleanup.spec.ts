import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(`ui-cleanup-${crypto.randomUUID()}@example.com`);
  await page.getByRole("textbox", { name: "Password" }).fill("correct horse battery");
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
});

for (const mode of ["percentages", "grams"]) {
  test(`nutrition inputs share height and typography in ${mode} mode`, async ({ page }) => {
    await page.goto("/profile/nutrition-goals");
    await expect(page.getByLabel("Daily calorie goal")).toBeVisible();
    await page.getByRole("button", { name: mode, exact: true }).click();
    const styles = await page.getByRole("spinbutton").evaluateAll((inputs) =>
      inputs.map((input) => {
        const style = getComputedStyle(input);
        return {
          height: input.getBoundingClientRect().height,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
        };
      }),
    );
    expect(styles).toHaveLength(4);
    for (const style of styles) expect(style).toEqual(styles[0]);
    await expect(
      page.getByText(
        /Set your daily calories|Gram targets are rounded|Previous days stay unchanged/,
      ),
    ).toHaveCount(0);
  });
}

test("meal dates are readable and meal and search helper text is removed", async ({ page }) => {
  await page.goto("/meal/breakfast?date=2026-06-10");
  await expect(page.locator("time")).toHaveText("10th June, 2026");
  await expect(page.getByText("No food logged yet.")).toBeVisible();
  await expect(page.getByText(/Tap a food to edit|Nutrition from/)).toHaveCount(0);
  await page.getByRole("link", { name: "ADD FOOD", exact: true }).click();
  await expect(page.getByRole("searchbox")).toBeVisible();
  await expect(page.getByText(/Search with at least/)).toHaveCount(0);
  await page.getByRole("searchbox").fill("zolty ser");
  await expect(page.getByRole("button", { name: /Żółty ser testowy/ })).toBeVisible();
  await expect(page.getByText(/Data:|Open Food Facts contributors/)).toHaveCount(0);
});
