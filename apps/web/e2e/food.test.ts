import { expect, test } from "@playwright/test";

for (const query of ["zolty ser", "Żółty", "calwise test"]) {
  test(`searches food through the service binding and D1: ${query}`, async ({ request }) => {
    const response = await request.get("http://localhost:8787/foods/search", {
      params: { q: query, limit: 1 },
    });
    expect(response.ok()).toBe(true);
    expect(await response.json()).toMatchObject({
      products: [
        {
          barcode: "0000000000001",
          name: "Żółty ser testowy",
          carbohydrates100g: 0,
          fiber100g: null,
        },
      ],
      attribution: { license: "ODbL-1.0" },
    });
  });
}

test("looks up barcodes through the service binding and D1", async ({ request }) => {
  const barcode = await request.get("http://localhost:8787/foods/barcode/0000000000001");
  expect(barcode.ok()).toBe(true);
  expect(await barcode.json()).toMatchObject({ product: { barcode: "0000000000001" } });
  const missing = await request.get("http://localhost:8787/foods/barcode/9999999999999");
  expect(missing.status()).toBe(404);
});
