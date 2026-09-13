import { test, type BrowserContext } from "@playwright/test";
import { PERSONAL_PRODUCT_CURSOR_MAX_LENGTH } from "@calwise/food-rules/personal-product";
import {
  collectPages,
  createPersonal,
  data,
  expect,
  logDate,
  mutate,
  productInput,
  query,
  signUp,
  type CatalogBarcodeResult,
  type FoodEntry,
  type PersonalBarcodeResult,
  type PersonalCreateResult,
  type PersonalGetResult,
  type PersonalListResult,
} from "./personal-product-fixtures.ts";

interface ConflictErrorData {
  readonly conflict: {
    readonly kind: "DUPLICATE_BARCODE" | "IDEMPOTENCY_KEY_REUSED";
    readonly existingProductId?: string;
  } | null;
}

async function errorData(
  response: import("@playwright/test").APIResponse,
): Promise<ConflictErrorData> {
  const body: unknown = await response.json();
  // SAFETY: tRPC error responses have either a transformed error.json.data or plain error.data envelope.
  const envelope = body as {
    error: { json?: { data?: ConflictErrorData }; data?: ConflictErrorData };
  };
  const result = envelope.error.json?.data ?? envelope.error.data;
  if (!result) throw new Error("tRPC error response did not include error data");
  return result;
}

async function restoreCookies(
  context: BrowserContext,
  cookies: Awaited<ReturnType<BrowserContext["cookies"]>>,
) {
  await context.clearCookies();
  await context.addCookies(cookies);
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

    const retrieved = await data<PersonalGetResult>(
      await query(page.request, "food.personalGet", { id: created.product.id }),
    );
    expect(retrieved.product).toEqual(created.product);
    expect(await data(await query(page.request, "foodLog.day", { date: logDate }))).toEqual([]);

    const sparse = await data<PersonalCreateResult>(
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
    const winner = await data<PersonalCreateResult>(responses.find((response) => response.ok())!);
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
    const ownerA = await data<PersonalCreateResult>(
      await createPersonal(page.request, {
        name: "Owner A private cheese",
        barcode: publicBarcode,
        energyKcal100: 111,
      }),
    );
    const ownerACookies = await page.context().cookies();

    await page.context().clearCookies();
    await signUp(page, "owner-b");
    const ownerB = await data<PersonalCreateResult>(
      await createPersonal(page.request, {
        name: "Owner B private cheese",
        barcode: publicBarcode,
        energyKcal100: 222,
      }),
    );
    const ownerBCookies = await page.context().cookies();
    const ownerBLookup = await data<PersonalBarcodeResult>(
      await query(page.request, "food.barcode", { barcode: publicBarcode }),
    );
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
    const ownerALookup = await data<PersonalBarcodeResult>(
      await query(page.request, "food.barcode", { barcode: publicBarcode }),
    );
    expect(ownerALookup).toMatchObject({
      source: "personal",
      product: { id: ownerA.product.id, energyKcal100: 111 },
    });

    await page.context().clearCookies();
    const anonymousLookup = await data<CatalogBarcodeResult>(
      await query(request, "food.barcode", { barcode: publicBarcode }),
    );
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
      initialResponses.map((response) => data<PersonalCreateResult>(response)),
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    const newest = await data<PersonalCreateResult>(
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

  test("round-trips Unicode search cursors produced from valid maximum-length text", async ({
    page,
  }) => {
    await signUp(page, "unicode-pagination");
    const text = "각".repeat(200);
    const queryText = "각";
    const responses = await Promise.all(
      Array.from({ length: 21 }, () => createPersonal(page.request, { name: text, brand: text })),
    );
    expect(responses.every((response) => response.ok())).toBe(true);

    const firstPage = await data<PersonalListResult>(
      await query(page.request, "food.personalList", { query: queryText }),
    );
    expect(firstPage.products).toHaveLength(20);
    expect(firstPage.nextCursor).not.toBeNull();
    expect(firstPage.nextCursor!.length).toBeGreaterThan(2_000);
    expect(firstPage.nextCursor!.length).toBeLessThanOrEqual(PERSONAL_PRODUCT_CURSOR_MAX_LENGTH);

    const products = await collectPages(page.request, { query: queryText });
    expect(products).toHaveLength(21);
    expect(new Set(products.map((product) => product.id)).size).toBe(21);
  });

  test("logs personal products with their basis and keeps captured nutrition through entry changes", async ({
    page,
  }) => {
    await signUp(page);
    const product = await data<PersonalCreateResult>(
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
