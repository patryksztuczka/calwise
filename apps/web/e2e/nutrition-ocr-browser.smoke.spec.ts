import { expect, test } from "@playwright/test";
import {
  inspectNutritionOcrRequest,
  isNutritionOcrCoreUrl,
  nutritionOcrAssetUrls,
  type NutritionOcrObservedRequest,
} from "../src/modules/scanner/nutrition-ocr-network-policy";

const runRealOcr = process.env.RUN_REAL_OCR === "1";

test.skip(!runRealOcr, "Set RUN_REAL_OCR=1 to download the real OCR engine and models.");

test("runs cold and warm production OCR without uploading either fixture", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(`real-ocr-${crypto.randomUUID()}@example.com`);
  await page.getByRole("textbox", { name: "Password" }).fill("correct horse battery");
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();

  const responses: { readonly url: string; readonly status: number }[] = [];
  const requests: NutritionOcrObservedRequest[] = [];
  let monitoring = false;
  page.on("response", (response) => {
    if (monitoring && response.url().startsWith("https://cdn.jsdelivr.net/")) {
      responses.push({ url: response.url(), status: response.status() });
    }
  });
  page.on("request", (request) => {
    if (!monitoring) return;
    requests.push({
      url: request.url(),
      method: request.method(),
      hasBody: request.postDataBuffer() !== null,
    });
  });

  await page.goto("/create-product");
  await expect(page.getByRole("button", { name: "SCAN NUTRITION LABEL" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  monitoring = true;
  await page.getByRole("button", { name: "SCAN NUTRITION LABEL" }).click();
  await page.getByLabel("CHOOSE LABEL IMAGE").setInputFiles("e2e/fixtures/nutrition-label.png");
  await expect(page.getByText("IMAGE READ. REVIEW REQUIRED")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Captured basis: per 100 ml")).toBeVisible();
  await expect(page.getByText("168 kJ")).toBeVisible();
  await expect(page.getByText("40 kcal")).toBeVisible();
  await expect(page.getByText("0.4 g")).toBeVisible();

  const coldResponses = [...responses];
  await page.getByRole("button", { name: "Back to creation options" }).click();
  await page.getByRole("button", { name: "SCAN NUTRITION LABEL" }).click();
  const warmResponseStart = responses.length;
  await page.getByLabel("CHOOSE LABEL IMAGE").setInputFiles("e2e/fixtures/nutrition-label-pl.png");
  await expect(page.getByText("IMAGE READ. REVIEW REQUIRED")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Captured basis: per 100 g")).toBeVisible();
  await expect(page.getByText("900 kJ")).toBeVisible();
  await expect(page.getByText("215 kcal")).toBeVisible();
  await expect(page.getByText("20 g")).toBeVisible();
  const warmResponses = responses.slice(warmResponseStart);

  expect(coldResponses.every((response) => response.status === 200)).toBe(true);
  expect(coldResponses.some((response) => response.url === nutritionOcrAssetUrls.worker)).toBe(
    true,
  );
  expect(coldResponses.some((response) => isNutritionOcrCoreUrl(response.url))).toBe(true);
  expect(
    coldResponses.some((response) => response.url === nutritionOcrAssetUrls.languages.eng),
  ).toBe(true);
  expect(
    coldResponses.some((response) => response.url === nutritionOcrAssetUrls.languages.pol),
  ).toBe(true);
  expect(warmResponses.every((response) => response.status === 200)).toBe(true);
  expect(
    warmResponses.some(
      (response) =>
        response.url === nutritionOcrAssetUrls.languages.eng ||
        response.url === nutritionOcrAssetUrls.languages.pol,
    ),
  ).toBe(false);

  expect(
    requests.flatMap((request) => {
      const violation = inspectNutritionOcrRequest(request);
      return violation ? [violation] : [];
    }),
  ).toEqual([]);
});
