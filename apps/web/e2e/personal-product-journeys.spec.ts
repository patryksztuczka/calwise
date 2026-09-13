import type { Page } from "@playwright/test";
import {
  collectPages,
  createPersonal,
  data,
  expect,
  logDate,
  password,
  query,
  signUp,
  test,
  type FoodEntry,
  type PersonalBarcodeResult,
  type PersonalCreateResult,
} from "./personal-product-fixtures.ts";

async function fillProductDetails(
  page: Page,
  {
    name,
    brand = "",
    barcode = "",
    packageQuantity = "",
    servingSize = "",
  }: {
    name: string;
    brand?: string;
    barcode?: string;
    packageQuantity?: string;
    servingSize?: string;
  },
) {
  await page.getByLabel("Product name").fill(name);
  await page.getByLabel("Brand (optional)").fill(brand);
  await page.getByLabel("Barcode (optional)").fill(barcode);
  await page.getByLabel("Package quantity (optional)").fill(packageQuantity);
  await page.getByLabel("Serving size (optional)").fill(servingSize);
}

async function openNutrition(page: Page) {
  await page.getByRole("button", { name: "NEXT: NUTRITION" }).click();
  await expect(page.getByLabel("Calories")).toBeVisible();
}

async function fillRequiredNutrition(
  page: Page,
  values: { calories?: string; protein?: string; carbohydrates?: string; fat?: string } = {},
) {
  await page.getByLabel("Calories").fill(values.calories ?? "123.456");
  await page.getByLabel("Protein").fill(values.protein ?? "1.25");
  await page.getByLabel("Carbohydrates").fill(values.carbohydrates ?? "2.5");
  await page.getByLabel("Fat", { exact: true }).fill(values.fat ?? "3.75");
}

function deferredSignal() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function navigateWithinApp(page: Page, url: string) {
  await page.evaluate((nextUrl) => {
    window.history.pushState(null, "", nextUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, url);
  await expect(page).toHaveURL(url);
}

test.describe("personal product browser journeys", () => {
  test("creates a barcode-free liquid, reloads My foods, then logs and edits it separately", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signUp(page, "browser-create");
    await page.goto(`/my-foods?date=${logDate}&meal=lunch`);
    await expect(page.getByRole("heading", { name: "ADD FOOD" })).toBeVisible();
    expect(await data(await query(page.request, "foodLog.day", { date: logDate }))).toEqual([]);

    await page.getByRole("link", { name: "Create product" }).click();
    await page.getByRole("button", { name: "NEXT: NUTRITION" }).click();
    await expect(page.getByRole("alert")).toHaveText("Enter a product name.");
    const name = `Browser liquid ${crypto.randomUUID()}`;
    await fillProductDetails(page, {
      name: `  ${name}  `,
      brand: "  Kitchen label  ",
      packageQuantity: "  1 L  ",
      servingSize: "  one glass  ",
    });
    await openNutrition(page);
    await expect(page.getByRole("radio", { name: "Per 100 g" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("button", { name: "SAVE PRODUCT" }).click();
    await expect(page.getByText("Calories is required.")).toBeVisible();
    await expect(page.getByText("Protein is required.")).toBeVisible();
    await expect(page.getByText("Carbohydrates is required.")).toBeVisible();
    await expect(page.getByText("Fat is required.")).toBeVisible();
    await fillRequiredNutrition(page, {
      calories: "123.456",
      protein: "1,25",
      carbohydrates: "999999",
      fat: "0",
    });
    await page.getByRole("radio", { name: "Per 100 ml" }).click();
    await expect(page.getByText("No conversion occurs.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "BACK", exact: true }).click();
    await expect(page.getByLabel("Product name")).toHaveValue(`  ${name}  `);
    await expect(page.getByLabel("Package quantity (optional)")).toHaveValue("  1 L  ");
    await openNutrition(page);
    await expect(page.getByRole("radio", { name: "Per 100 ml" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByLabel("Protein")).toHaveValue("1,25");
    await expect(page.getByLabel("Carbohydrates")).toHaveValue("999999");
    await expect(page.getByLabel("Fat", { exact: true })).toHaveValue("0");
    await page.getByRole("button", { name: "SAVE PRODUCT" }).click();

    await expect(page).toHaveURL(new RegExp(`/my-foods\\?date=${logDate}&meal=lunch`));
    await expect(
      page.getByRole("status").filter({ hasText: `${name} saved to My foods` }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "DONE · 0 FOODS ADDED" })).toBeVisible();
    if (process.env.CAPTURE_PR_SCREENSHOTS === "1") {
      await page.screenshot({ path: "/tmp/calwise-food-selection-after.png", fullPage: true });
    }
    expect(await data(await query(page.request, "foodLog.day", { date: logDate }))).toEqual([]);

    const saved = await collectPages(page.request, { query: name });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      name,
      brand: "Kitchen label",
      barcode: null,
      packageQuantity: "1 L",
      servingSize: "one glass",
      nutritionBasis: "ml",
      energyKcal100: 123.456,
      protein100: 1.25,
      carbohydrates100: 999999,
      fat100: 0,
      energyKj100: null,
    });

    await page.reload();
    await expect(page.getByRole("button", { name: `Select ${name}` })).toBeVisible();
    await page.getByRole("button", { name: `Select ${name}` }).click();
    await expect(page.getByLabel("Unit")).toHaveValue("ml");
    await expect(page.getByLabel("Unit")).toBeDisabled();
    await page.getByLabel("AMOUNT", { exact: true }).fill("2");
    await page.getByRole("button", { name: "ADD TO LUNCH" }).click();
    await expect(page.getByText(`${name} added`, { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "DONE · 1 FOODS ADDED" }).click();
    await page.getByRole("link", { name }).click();
    await expect(page.getByLabel("Unit")).toHaveValue("ml");
    await expect(page.getByLabel("Unit")).toBeDisabled();
    await page.getByLabel("AMOUNT", { exact: true }).fill("3.5");
    await page.getByRole("button", { name: "SAVE CHANGES" }).click();
    await expect(page.getByText("Changes saved", { exact: true })).toBeVisible();
    const logged = await data<FoodEntry[]>(
      await query(page.request, "foodLog.day", { date: logDate }),
    );
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({
      name,
      amount: 3.5,
      unit: "ml",
      productSource: "personal",
      personalProductId: saved[0]!.id,
      nutritionBasis: "ml",
      energyKcal100g: 123.456,
    });
  });

  test("creates from a barcode no-match without losing barcode, meal, or date", async ({
    page,
    barcodeScanner,
  }) => {
    await signUp(page, "browser-no-match");
    const barcode = `9999${Math.floor(1_000_000_000 + Math.random() * 8_000_000_000)}`;
    await page.goto(`/scan?date=${logDate}&meal=dinner`);
    await expect(page.getByRole("heading", { name: "SCAN BARCODE" })).toBeVisible();
    await barcodeScanner.capture(barcode);
    await expect(page.getByRole("heading", { name: "PRODUCT NOT FOUND" })).toBeVisible();
    await page.getByRole("link", { name: "CREATE PRODUCT" }).click();
    await expect(page.getByLabel("Barcode (optional)")).toHaveValue(barcode);
    await expect(page).toHaveURL(new RegExp(`/create-product\\?date=${logDate}&meal=dinner$`));

    const name = `No-match product ${crypto.randomUUID()}`;
    await fillProductDetails(page, { name, barcode });
    await openNutrition(page);
    await fillRequiredNutrition(page);
    await page.getByRole("button", { name: "SAVE PRODUCT" }).click();
    await expect(page).toHaveURL(new RegExp(`/my-foods\\?date=${logDate}&meal=dinner`));
    await expect(
      page.getByRole("button", { name: "ADDING TO Dinner", exact: false }),
    ).toBeVisible();
    const lookup = await data<PersonalBarcodeResult>(
      await query(page.request, "food.barcode", { barcode }),
    );
    expect(lookup).toMatchObject({ source: "personal", product: { name, barcode } });
    expect(await data(await query(page.request, "foodLog.day", { date: logDate }))).toEqual([]);
  });

  test("keeps the draft through scanner cancellation and completion, and warns before discard", async ({
    page,
    barcodeScanner,
  }) => {
    await signUp(page, "browser-draft");
    await page.goto(`/create-product?date=${logDate}&meal=snacks`);
    await fillProductDetails(page, {
      name: "Draft product",
      brand: "Draft brand",
      packageQuantity: "500 g",
      servingSize: "one scoop",
    });
    await page.getByRole("button", { name: "Open barcode scanner" }).click();
    await page.getByRole("button", { name: "Cancel barcode scanning" }).click();
    await expect(page.getByLabel("Product name")).toHaveValue("Draft product");
    await expect(page.getByLabel("Brand (optional)")).toHaveValue("Draft brand");

    await page.getByRole("button", { name: "Open barcode scanner" }).click();
    await barcodeScanner.capture("00001234");
    await expect(page.getByRole("button", { name: "Cancel barcode scanning" })).toHaveCount(0);
    await expect(page.getByLabel("Barcode (optional)")).toHaveValue("00001234");
    await expect(page.getByLabel("Package quantity (optional)")).toHaveValue("500 g");
    await expect(page.getByLabel("Serving size (optional)")).toHaveValue("one scoop");

    await page.getByRole("button", { name: "Back to My foods" }).click();
    const dialog = page.getByRole("alertdialog", { name: "DISCARD PRODUCT?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "KEEP EDITING" }).click();
    await expect(page.getByLabel("Product name")).toHaveValue("Draft product");
    await page.getByRole("button", { name: "Back to My foods" }).click();
    await dialog.getByRole("button", { name: "Discard changes" }).click();
    await expect(page.getByRole("heading", { name: "ADD FOOD" })).toBeVisible();

    await page.goto(`/create-product?date=${logDate}&meal=snacks`);
    await page.getByLabel("Product name").fill("Reloaded draft");
    page.once("dialog", (nativeDialog) => void nativeDialog.accept());
    await page.reload();
    await expect(page.getByLabel("Product name")).toHaveValue("");
    await expect(page.getByLabel("Barcode (optional)")).toHaveValue("");
  });

  test("retries a barcode-free save after the real response is lost without creating a duplicate", async ({
    page,
  }) => {
    await signUp(page, "browser-retry");
    await page.goto(`/create-product?date=${logDate}&meal=breakfast`);
    const name = `Uncertain save ${crypto.randomUUID()}`;
    await fillProductDetails(page, { name });
    await openNutrition(page);
    await fillRequiredNutrition(page);

    const createUrl = /\/trpc\/food\.personalCreate(?:\?|$)/;
    let workerStatus: number | undefined;
    await page.route(createUrl, async (route) => {
      const response = await route.fetch();
      workerStatus = response.status();
      await route.fulfill({ status: 503, body: "Worker response lost after persistence" });
    });
    await page.getByRole("button", { name: "SAVE PRODUCT" }).click();
    await expect(page.getByRole("alert")).toContainText("Could not save this product");
    expect(workerStatus).toBe(200);
    await expect(page.getByLabel("Calories")).toHaveValue("123.456");
    await page.unroute(createUrl);

    await page.getByRole("button", { name: "SAVE PRODUCT" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: `${name} saved to My foods` }),
    ).toBeVisible();
    const products = await collectPages(page.request, { query: name });
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ name, barcode: null });
  });

  test("keeps an in-flight draft immutable and handles the delayed save response", async ({
    page,
  }) => {
    await signUp(page, "browser-pending-save");
    await page.goto(`/create-product?date=${logDate}&meal=lunch`);
    const name = `Delayed save ${crypto.randomUUID()}`;
    await fillProductDetails(page, { name });
    await openNutrition(page);
    await fillRequiredNutrition(page);

    const requestReceived = deferredSignal();
    const releaseResponse = deferredSignal();
    await page.route(/\/trpc\/food\.personalCreate(?:\?|$)/, async (route) => {
      requestReceived.resolve();
      await releaseResponse.promise;
      await route.continue();
    });
    await page.getByRole("button", { name: "SAVE PRODUCT" }).click();
    await requestReceived.promise;

    const calories = page.getByLabel("Calories");
    const millilitres = page.getByRole("radio", { name: "Per 100 ml" });
    await expect(calories).toBeDisabled();
    await expect(millilitres).toBeDisabled();
    await expect(page.getByRole("button", { name: "Back to product details" })).toBeDisabled();
    await calories.click({ force: true });
    await page.keyboard.type("999");
    await millilitres.click({ force: true });
    await expect(calories).toHaveValue("123.456");
    await expect(page.getByRole("radio", { name: "Per 100 g" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    releaseResponse.resolve();
    await expect(
      page.getByRole("status").filter({ hasText: `${name} saved to My foods` }),
    ).toBeVisible();
    expect(await collectPages(page.request, { query: name })).toHaveLength(1);
  });

  test("keeps a duplicate-barcode draft and opens the existing private product", async ({
    page,
  }) => {
    await signUp(page, "browser-conflict");
    const barcode = `8${Math.floor(1_000_000_000_000 + Math.random() * 8_000_000_000_000)}`;
    const name = `Duplicate name ${crypto.randomUUID()}`;
    const existing = await data<PersonalCreateResult>(
      await createPersonal(page.request, { name, barcode, energyKcal100: 777 }),
    );
    await page.goto(`/create-product?date=${logDate}&meal=lunch`);
    await fillProductDetails(page, { name, brand: "Draft stays", barcode });
    await openNutrition(page);
    await fillRequiredNutrition(page, { calories: "111" });
    await page.getByRole("button", { name: "SAVE PRODUCT" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "You already have a personal product with this barcode",
    );
    await expect(page.getByLabel("Calories")).toHaveValue("111");
    await page.getByRole("button", { name: "View existing product" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByText("777 kcal", { exact: false })).toBeVisible();
    await page
      .getByRole("button", { name: "Back to draft" })
      .filter({ hasText: "Back to draft" })
      .click();
    await page.getByRole("button", { name: "BACK", exact: true }).click();
    await expect(page.getByLabel("Barcode (optional)")).toHaveValue(barcode);
    await expect(page.getByLabel("Brand (optional)")).toHaveValue("Draft stays");
    await page.getByLabel("Barcode (optional)").fill("");
    await openNutrition(page);
    await page.getByRole("button", { name: "SAVE PRODUCT" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: `${name} saved to My foods` }),
    ).toBeVisible();
    const sameNames = await collectPages(page.request, { query: name });
    expect(sameNames).toHaveLength(2);
    const ids = sameNames.map((product) => product.id);
    expect(ids).toContain(existing.product.id);
    expect(new Set(ids).size).toBe(2);
  });

  test("does not show cached or late owner data after changing accounts", async ({
    page,
    barcodeScanner,
  }) => {
    await signUp(page, "cache-owner");
    const listName = `Owner A list ${crypto.randomUUID()}`;
    const cachedLookupName = `Owner A cached lookup ${crypto.randomUUID()}`;
    const lateLookupName = `Owner A late lookup ${crypto.randomUUID()}`;
    const cachedBarcode = `7${Math.floor(100_000_000_000 + Math.random() * 800_000_000_000)}`;
    const lateBarcode = `8${Math.floor(100_000_000_000 + Math.random() * 800_000_000_000)}`;
    const creates = await Promise.all([
      createPersonal(page.request, { name: listName }),
      createPersonal(page.request, { name: cachedLookupName, barcode: cachedBarcode }),
      createPersonal(page.request, { name: lateLookupName, barcode: lateBarcode }),
    ]);
    expect(creates.every((response) => response.ok())).toBe(true);

    const destination = `date=${logDate}&meal=lunch`;
    await page.goto(`/my-foods?${destination}`);
    await expect(page.getByRole("button", { name: `Select ${listName}` })).toBeVisible();
    await page.getByRole("link", { name: "Scan barcode" }).click();
    await expect(page.getByRole("heading", { name: "SCAN BARCODE" })).toBeVisible();
    await barcodeScanner.capture(cachedBarcode);
    await expect(page.getByRole("heading", { name: "PRODUCT FOUND" })).toBeVisible();
    await expect(page.getByText(cachedLookupName, { exact: true })).toBeVisible();

    const listReceived = deferredSignal();
    const releaseList = deferredSignal();
    const listDelivered = deferredSignal();
    let holdNextList = true;
    await page.route(/\/trpc\/food\.personalList(?:\?|$)/, async (route) => {
      if (!holdNextList) {
        await route.continue();
        return;
      }
      holdNextList = false;
      const response = await route.fetch();
      listReceived.resolve();
      await releaseList.promise;
      try {
        await route.fulfill({ response });
      } finally {
        listDelivered.resolve();
      }
    });
    await navigateWithinApp(
      page,
      `/my-foods?${destination}&q=${encodeURIComponent(lateLookupName)}`,
    );
    await listReceived.promise;

    const barcodeReceived = deferredSignal();
    const releaseBarcode = deferredSignal();
    const barcodeDelivered = deferredSignal();
    let holdNextBarcode = true;
    await page.route(/\/trpc\/food\.barcode(?:\?|$)/, async (route) => {
      if (!holdNextBarcode) {
        await route.continue();
        return;
      }
      holdNextBarcode = false;
      const response = await route.fetch();
      barcodeReceived.resolve();
      await releaseBarcode.promise;
      try {
        await route.fulfill({ response });
      } finally {
        barcodeDelivered.resolve();
      }
    });
    await navigateWithinApp(page, `/scan?${destination}`);
    await expect(page.getByRole("heading", { name: "SCAN BARCODE" })).toBeVisible();
    await barcodeScanner.capture(lateBarcode);
    await barcodeReceived.promise;

    await page.context().clearCookies();
    await navigateWithinApp(page, "/sign-up");
    const ownerBEmail = `cache-other-${crypto.randomUUID()}@example.com`;
    await page.getByLabel("Email").fill(ownerBEmail);
    await page.getByRole("textbox", { name: "Password" }).fill(password);
    await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
    await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();

    await navigateWithinApp(page, `/my-foods?${destination}`);
    await expect(
      page.getByText("Your saved products will appear here", { exact: false }),
    ).toBeVisible();

    releaseList.resolve();
    releaseBarcode.resolve();
    await Promise.all([listDelivered.promise, barcodeDelivered.promise]);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    await Promise.all(
      [listName, cachedLookupName, lateLookupName].map((ownerAName) =>
        expect(page.getByText(ownerAName, { exact: true })).toHaveCount(0),
      ),
    );

    await navigateWithinApp(page, `/scan?${destination}`);
    await barcodeScanner.capture(cachedBarcode);
    await expect(page.getByRole("heading", { name: "PRODUCT NOT FOUND" })).toBeVisible();
    await expect(page.getByText(cachedLookupName, { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Scan again", exact: true }).click();
    await barcodeScanner.capture(lateBarcode);
    await expect(page.getByRole("heading", { name: "PRODUCT NOT FOUND" })).toBeVisible();
    await expect(page.getByText(lateLookupName, { exact: true })).toHaveCount(0);
  });
});
