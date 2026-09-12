import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { apiUrl } from "./urls.ts";

const password = "correct horse battery";
const logDate = "2026-01-02";

interface PersonalProduct {
  readonly source: "personal";
  readonly id: string;
  readonly barcode: string | null;
  readonly name: string;
  readonly brand: string | null;
  readonly packageQuantity: string | null;
  readonly servingSize: string | null;
  readonly nutritionBasis: "g" | "ml";
  readonly energyKcal100: number;
  readonly energyKj100: number | null;
  readonly protein100: number;
  readonly carbohydrates100: number;
  readonly fat100: number;
  readonly saturatedFat100: number | null;
  readonly sugars100: number | null;
  readonly fiber100: number | null;
  readonly salt100: number | null;
  readonly sodium100: number | null;
  readonly createdAt: number;
}

interface FoodEntry {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly unit: "g" | "ml";
  readonly meal: string;
  readonly productSource: "catalog" | "personal";
  readonly personalProductId: string | null;
  readonly nutritionBasis: "g" | "ml" | null;
  readonly energyKcal100g: number;
  readonly protein100g: number;
  readonly carbohydrates100g: number;
  readonly fat100g: number;
}

interface CatalogProduct {
  readonly source: "catalog";
  readonly barcode: string;
  readonly name: string;
  readonly energyKcal100g: number;
}

interface Attribution {
  readonly license: string;
}

interface PersonalCreateResult {
  readonly created: boolean;
  readonly product: PersonalProduct;
}

interface PersonalListResult {
  readonly products: PersonalProduct[];
  readonly nextCursor: string | null;
}

interface ConflictErrorData {
  readonly conflict: {
    readonly kind: "DUPLICATE_BARCODE" | "IDEMPOTENCY_KEY_REUSED";
    readonly existingProductId?: string;
  } | null;
}

/** Transport values include deliberately invalid cases used to prove server validation. */
interface RpcInput {
  readonly requestId?: string;
  readonly id?: string;
  readonly name?: string;
  readonly brand?: string;
  readonly barcode?: string;
  readonly packageQuantity?: string;
  readonly servingSize?: string;
  readonly nutritionBasis?: string;
  readonly energyKcal100?: number | string | null;
  readonly energyKj100?: number | string | null;
  readonly protein100?: number | string | null;
  readonly carbohydrates100?: number | string | null;
  readonly fat100?: number | string | null;
  readonly saturatedFat100?: number | string | null;
  readonly sugars100?: number | string | null;
  readonly fiber100?: number | string | null;
  readonly salt100?: number | string | null;
  readonly sodium100?: number | string | null;
  readonly query?: string;
  readonly cursor?: string | null;
  readonly productReference?: {
    readonly source: string;
    readonly id?: string;
    readonly barcode?: string;
  };
  readonly amount?: number | string;
  readonly unit?: string;
  readonly date?: string;
  readonly meal?: string;
}

async function signUp(page: Page, label = "personal-product") {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(`${label}-${crypto.randomUUID()}@example.com`);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await expect(page.getByRole("heading", { name: "CALWISE" })).toBeVisible();
}

function query(request: APIRequestContext, procedure: string, input: RpcInput) {
  return request.get(`${apiUrl}/trpc/${procedure}`, {
    params: { input: JSON.stringify(input) },
  });
}

function mutate(request: APIRequestContext, procedure: string, input: RpcInput) {
  return request.post(`${apiUrl}/trpc/${procedure}`, { data: input });
}

async function data<T = unknown>(response: APIResponse): Promise<T> {
  expect(response.ok(), await response.text()).toBe(true);
  const body: unknown = await response.json();
  // SAFETY: successful tRPC responses have a result.data envelope; each caller asserts its contract fields.
  return (body as { result: { data: T } }).result.data;
}

async function errorData(response: APIResponse): Promise<ConflictErrorData> {
  const body: unknown = await response.json();
  // SAFETY: tRPC error responses have either a transformed error.json.data or plain error.data envelope.
  const envelope = body as {
    error: { json?: { data?: ConflictErrorData }; data?: ConflictErrorData };
  };
  const result = envelope.error.json?.data ?? envelope.error.data;
  if (!result) throw new Error("tRPC error response did not include error data");
  return result;
}

function productInput(overrides: RpcInput = {}) {
  return {
    requestId: crypto.randomUUID(),
    name: `Test product ${crypto.randomUUID()}`,
    nutritionBasis: "g",
    energyKcal100: 123.456789,
    protein100: 10.125,
    carbohydrates100: 20.25,
    fat100: 3.5,
    ...overrides,
  };
}

async function createPersonal(request: APIRequestContext, overrides: RpcInput = {}) {
  return mutate(request, "food.personalCreate", productInput(overrides));
}

async function restoreCookies(
  context: BrowserContext,
  cookies: Awaited<ReturnType<BrowserContext["cookies"]>>,
) {
  await context.clearCookies();
  await context.addCookies(cookies);
}

async function collectPages(
  request: APIRequestContext,
  input: { readonly query?: string } = {},
  cursor?: string,
  collected: PersonalProduct[] = [],
): Promise<PersonalProduct[]> {
  const listInput: RpcInput = cursor ? { ...input, cursor } : input;
  const page = await data<PersonalListResult>(await query(request, "food.personalList", listInput));
  const products = [...collected, ...page.products];
  return page.nextCursor ? collectPages(request, input, page.nextCursor, products) : products;
}

test.describe("personal product HTTP contracts", () => {
  test("normalizes details, preserves optional nutrition and precision, and does not log on save", async ({
    page,
  }) => {
    await signUp(page);
    const before = await data<unknown[]>(
      await query(page.request, "foodLog.day", { date: logDate }),
    );
    expect(before).toEqual([]);

    const response = await createPersonal(page.request, {
      name: "  Precision drink  ",
      brand: "  Label brand  ",
      barcode: "00001234",
      packageQuantity: "  1 L  ",
      servingSize: "  one glass, 250 ml  ",
      nutritionBasis: "ml",
      energyKcal100: 0,
      energyKj100: 999999.123456,
      protein100: 0,
      carbohydrates100: 12.3456789,
      fat100: 0,
      saturatedFat100: 1.234567,
      sugars100: 11.111111,
      fiber100: 2.222222,
      salt100: 0.333333,
      sodium100: 0.012345,
    });
    const created = await data<PersonalCreateResult>(response);
    expect(created.created).toBe(true);
    expect(created.product).toMatchObject({
      source: "personal",
      name: "Precision drink",
      brand: "Label brand",
      barcode: "00001234",
      packageQuantity: "1 L",
      servingSize: "one glass, 250 ml",
      nutritionBasis: "ml",
      energyKcal100: 0,
      energyKj100: 999999.123456,
      protein100: 0,
      carbohydrates100: 12.3456789,
      fat100: 0,
      saturatedFat100: 1.234567,
      sugars100: 11.111111,
      fiber100: 2.222222,
      salt100: 0.333333,
      sodium100: 0.012345,
    });

    const retrieved = await data<{ product: PersonalProduct }>(
      await query(page.request, "food.personalGet", { id: created.product.id }),
    );
    expect(retrieved.product).toEqual(created.product);
    expect(await data(await query(page.request, "foodLog.day", { date: logDate }))).toEqual([]);

    const sparse = await data<{ product: PersonalProduct }>(
      await createPersonal(page.request, {
        name: "Unknown optional values",
        brand: "   ",
        barcode: "",
        packageQuantity: " ",
        servingSize: "",
      }),
    );
    expect(sparse.product).toMatchObject({
      brand: null,
      barcode: null,
      packageQuantity: null,
      servingSize: null,
      energyKj100: null,
      saturatedFat100: null,
      sugars100: null,
      fiber100: null,
      salt100: null,
      sodium100: null,
    });
  });

  test("rejects invalid text, barcodes, and nutrition without adding plausibility rules", async ({
    page,
  }) => {
    await signUp(page);
    const invalid = [
      { name: "   " },
      { name: "x".repeat(201) },
      { brand: "x".repeat(201) },
      { packageQuantity: "x".repeat(201) },
      { servingSize: "x".repeat(201) },
      { barcode: "123" },
      { barcode: "1".repeat(25) },
      { barcode: "1234x" },
      { nutritionBasis: "kg" },
      { energyKcal100: -1 },
      { energyKcal100: "Infinity" },
      { protein100: -0.1 },
      { carbohydrates100: "12,5" },
      { fat100: null },
      { sodium100: -1 },
    ];
    const invalidResponses = await Promise.all(
      invalid.map((patch) => createPersonal(page.request, patch)),
    );
    invalidResponses.forEach((response, index) => {
      expect(response.status(), JSON.stringify(invalid[index])).toBe(400);
    });

    const implausible = await createPersonal(page.request, {
      energyKcal100: 999999,
      protein100: 999999,
      carbohydrates100: 999999,
      fat100: 999999,
      sugars100: 999999,
      sodium100: 999999,
    });
    expect(implausible.ok()).toBe(true);
  });

  test("makes barcode-free retries idempotent and resolves concurrent barcode conflicts", async ({
    page,
  }) => {
    await signUp(page);
    const retry = productInput({ name: "Barcode-free retry" });
    const [first, second] = await Promise.all([
      mutate(page.request, "food.personalCreate", retry),
      mutate(page.request, "food.personalCreate", retry),
    ]);
    const firstData = await data<PersonalCreateResult>(first);
    const secondData = await data<PersonalCreateResult>(second);
    expect(firstData.product.id).toBe(secondData.product.id);
    expect([firstData.created, secondData.created].toSorted()).toEqual([false, true]);

    const changedRetry = await mutate(page.request, "food.personalCreate", {
      ...retry,
      name: "Changed retry payload",
    });
    expect(changedRetry.status()).toBe(409);
    expect(await changedRetry.text()).toContain("IDEMPOTENCY_KEY_REUSED");

    const barcode = `${Date.now()}${Math.floor(Math.random() * 100_000)}`.slice(0, 18);
    const submissions = [
      productInput({ name: "Concurrent first", barcode }),
      productInput({ name: "Concurrent second", barcode }),
    ];
    const responses = await Promise.all(
      submissions.map((input) => mutate(page.request, "food.personalCreate", input)),
    );
    expect(responses.map((response) => response.status()).toSorted()).toEqual([200, 409]);
    const winner = await data<{ product: PersonalProduct }>(
      responses.find((response) => response.ok())!,
    );
    const conflict = responses.find((response) => response.status() === 409)!;
    expect(await errorData(conflict)).toMatchObject({
      conflict: { kind: "DUPLICATE_BARCODE", existingProductId: winner.product.id },
    });
    const listed = await collectPages(page.request);
    expect(listed.filter((product) => product.barcode === barcode)).toHaveLength(1);
  });

  test("isolates ownership while allowing the same public barcode in separate accounts", async ({
    page,
    request,
  }) => {
    const publicBarcode = "0000000000001";
    await signUp(page, "owner-a");
    const ownerA = await data<{ product: PersonalProduct }>(
      await createPersonal(page.request, {
        name: "Owner A private cheese",
        barcode: publicBarcode,
        energyKcal100: 111,
      }),
    );
    const ownerACookies = await page.context().cookies();

    await page.context().clearCookies();
    await signUp(page, "owner-b");
    const ownerB = await data<{ product: PersonalProduct }>(
      await createPersonal(page.request, {
        name: "Owner B private cheese",
        barcode: publicBarcode,
        energyKcal100: 222,
      }),
    );
    const ownerBCookies = await page.context().cookies();
    const ownerBLookup = await data<{
      source: "personal";
      product: PersonalProduct;
      attribution: null;
    }>(await query(page.request, "food.barcode", { barcode: publicBarcode }));
    expect(ownerBLookup).toMatchObject({
      source: "personal",
      product: { id: ownerB.product.id, energyKcal100: 222 },
      attribution: null,
    });
    expect(
      (await query(page.request, "food.personalGet", { id: ownerA.product.id })).status(),
    ).toBe(404);

    const foreignLog = await mutate(page.request, "foodLog.add", {
      id: crypto.randomUUID(),
      productReference: { source: "personal", id: ownerA.product.id },
      amount: 100,
      unit: "g",
      date: logDate,
      meal: "lunch",
    });
    expect(foreignLog.status()).toBe(404);

    await restoreCookies(page.context(), ownerACookies);
    const ownerALookup = await data<{ source: "personal"; product: PersonalProduct }>(
      await query(page.request, "food.barcode", { barcode: publicBarcode }),
    );
    expect(ownerALookup).toMatchObject({
      source: "personal",
      product: { id: ownerA.product.id, energyKcal100: 111 },
    });

    await page.context().clearCookies();
    const anonymousLookup = await data<{
      source: "catalog";
      product: CatalogProduct;
      attribution: Attribution;
    }>(await query(request, "food.barcode", { barcode: publicBarcode }));
    expect(anonymousLookup).toMatchObject({
      source: "catalog",
      product: { source: "catalog", barcode: publicBarcode, name: "Żółty ser testowy" },
      attribution: { license: "ODbL-1.0" },
    });
    const anonymousPersonalResponses = await Promise.all([
      query(request, "food.personalList", {}),
      query(request, "food.personalGet", { id: ownerA.product.id }),
    ]);
    expect(anonymousPersonalResponses.map((response) => response.status())).toEqual([401, 401]);
    expect((await createPersonal(request)).status()).toBe(401);
    expect(
      (
        await mutate(request, "foodLog.add", {
          id: crypto.randomUUID(),
          productReference: { source: "personal", id: ownerA.product.id },
          amount: 100,
          unit: "g",
          date: logDate,
          meal: "lunch",
        })
      ).status(),
    ).toBe(401);

    await restoreCookies(page.context(), ownerBCookies);
    expect((await query(page.request, "food.personalGet", { id: ownerB.product.id })).ok()).toBe(
      true,
    );
  });

  test("paginates browsing and folded multiword search without skips or duplicate rows", async ({
    page,
  }) => {
    await signUp(page);
    const initialResponses = await Promise.all(
      Array.from({ length: 24 }, (_, index) =>
        createPersonal(
          page.request,
          index < 23
            ? { name: "Paged Żółta Łódź", brand: "MŁYN Firma" }
            : { name: `Unmatched ${String(index).padStart(2, "0")}` },
        ),
      ),
    );
    const initialProducts = await Promise.all(
      initialResponses.map((response) => data<{ product: PersonalProduct }>(response)),
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    const newest = await data<{ product: PersonalProduct }>(
      await createPersonal(page.request, { name: "Newest unmatched" }),
    );
    const created = [...initialProducts.map((result) => result.product), newest.product];

    const firstBrowse = await data<PersonalListResult>(
      await query(page.request, "food.personalList", {}),
    );
    expect(firstBrowse.products).toHaveLength(20);
    expect(firstBrowse.products[0]?.id).toBe(newest.product.id);
    expect(firstBrowse.nextCursor).not.toBeNull();
    const browsed = await collectPages(page.request);
    expect(browsed).toHaveLength(25);
    expect(new Set(browsed.map((product) => product.id)).size).toBe(25);
    expect(new Set(browsed.map((product) => product.barcode))).toEqual(new Set([null]));
    for (let index = 1; index < browsed.length; index += 1) {
      expect(String(browsed[index - 1]!.createdAt) >= String(browsed[index]!.createdAt)).toBe(true);
    }

    const searched = await collectPages(page.request, { query: "PAGED zolt lod ML fir" });
    expect(searched).toHaveLength(23);
    expect(new Set(searched.map((product) => product.id)).size).toBe(23);
    expect(searched.map((product) => product.id).toSorted()).toEqual(
      created
        .slice(0, 23)
        .map((product) => product.id)
        .toSorted(),
    );
    expect(await collectPages(page.request, { query: "nothing matches" })).toEqual([]);

    const alphabeticalCreates = await Promise.all(
      ["Żebra Shared", "Ąlfa Shared", "Banana Shared"].map((name) =>
        createPersonal(page.request, { name }),
      ),
    );
    expect(alphabeticalCreates.every((response) => response.ok())).toBe(true);
    const alphabetical = await collectPages(page.request, { query: "SHAR" });
    expect(alphabetical.map((product) => product.name)).toEqual([
      "Ąlfa Shared",
      "Banana Shared",
      "Żebra Shared",
    ]);

    const wrongQueryCursor = await query(page.request, "food.personalList", {
      query: "different",
      cursor: firstBrowse.nextCursor,
    });
    expect(wrongQueryCursor.status()).toBe(400);
  });

  test("logs personal products with their basis and keeps captured nutrition through entry changes", async ({
    page,
  }) => {
    await signUp(page);
    const product = await data<{ product: PersonalProduct }>(
      await createPersonal(page.request, {
        name: "Snapshot liquid",
        nutritionBasis: "ml",
        energyKcal100: 123.456,
        protein100: 1.25,
        carbohydrates100: 2.5,
        fat100: 3.75,
      }),
    );
    const reference = { source: "personal", id: product.product.id };
    const incompatible = await mutate(page.request, "foodLog.add", {
      id: crypto.randomUUID(),
      productReference: reference,
      amount: 250,
      unit: "g",
      date: logDate,
      meal: "lunch",
    });
    expect(incompatible.status()).toBe(400);

    const firstId = crypto.randomUUID();
    const first = await data<FoodEntry>(
      await mutate(page.request, "foodLog.add", {
        id: firstId,
        productReference: reference,
        amount: 250,
        unit: "ml",
        date: logDate,
        meal: "lunch",
      }),
    );
    expect(first).toMatchObject({
      id: firstId,
      name: "Snapshot liquid",
      amount: 250,
      unit: "ml",
      productSource: "personal",
      personalProductId: product.product.id,
      nutritionBasis: "ml",
      energyKcal100g: 123.456,
      protein100g: 1.25,
      carbohydrates100g: 2.5,
      fat100g: 3.75,
    });

    const secondId = crypto.randomUUID();
    expect(
      (
        await mutate(page.request, "foodLog.add", {
          id: secondId,
          productReference: reference,
          amount: 100,
          unit: "ml",
          date: logDate,
          meal: "lunch",
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await mutate(page.request, "foodLog.update", {
          id: firstId,
          amount: 50.5,
          unit: "g",
          date: logDate,
          meal: "dinner",
        })
      ).status(),
    ).toBe(400);
    const updated = await data<FoodEntry>(
      await mutate(page.request, "foodLog.update", {
        id: firstId,
        amount: 50.5,
        unit: "ml",
        date: logDate,
        meal: "dinner",
      }),
    );
    expect(updated).toMatchObject({
      id: firstId,
      amount: 50.5,
      unit: "ml",
      meal: "dinner",
      name: "Snapshot liquid",
      energyKcal100g: 123.456,
      personalProductId: product.product.id,
    });
    const day = await data<FoodEntry[]>(
      await query(page.request, "foodLog.day", { date: logDate }),
    );
    expect(day).toHaveLength(2);
    expect(new Set(day.map((entry) => entry.id))).toEqual(new Set([firstId, secondId]));
  });
});

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

async function dispatchBarcode(page: Page, code: string) {
  await page.evaluate((capturedCode) => {
    window.dispatchEvent(
      new CustomEvent("calwise:barcode-captured", { detail: { code: capturedCode } }),
    );
  }, code);
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
  }) => {
    await signUp(page, "browser-no-match");
    const barcode = `9999${Math.floor(1_000_000_000 + Math.random() * 8_000_000_000)}`;
    await page.goto(`/scan?date=${logDate}&meal=dinner`);
    await expect(page.getByRole("heading", { name: "SCAN BARCODE" })).toBeVisible();
    await dispatchBarcode(page, barcode);
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
    const lookup = await data<{ source: "personal"; product: PersonalProduct }>(
      await query(page.request, "food.barcode", { barcode }),
    );
    expect(lookup).toMatchObject({ source: "personal", product: { name, barcode } });
    expect(await data(await query(page.request, "foodLog.day", { date: logDate }))).toEqual([]);
  });

  test("keeps the draft through scanner cancellation and completion, and warns before discard", async ({
    page,
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
    await dispatchBarcode(page, "00001234");
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

  test("keeps a duplicate-barcode draft and opens the existing private product", async ({
    page,
  }) => {
    await signUp(page, "browser-conflict");
    const barcode = `8${Math.floor(1_000_000_000_000 + Math.random() * 8_000_000_000_000)}`;
    const name = `Duplicate name ${crypto.randomUUID()}`;
    const existing = await data<{ product: PersonalProduct }>(
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

  test("does not show cached or late owner data after changing accounts", async ({ page }) => {
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
    await dispatchBarcode(page, cachedBarcode);
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
    await dispatchBarcode(page, lateBarcode);
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
    await dispatchBarcode(page, cachedBarcode);
    await expect(page.getByRole("heading", { name: "PRODUCT NOT FOUND" })).toBeVisible();
    await expect(page.getByText(cachedLookupName, { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Scan again", exact: true }).click();
    await dispatchBarcode(page, lateBarcode);
    await expect(page.getByRole("heading", { name: "PRODUCT NOT FOUND" })).toBeVisible();
    await expect(page.getByText(lateLookupName, { exact: true })).toHaveCount(0);
  });
});
