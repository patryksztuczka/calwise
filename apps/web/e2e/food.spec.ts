import { expect, test } from "@playwright/test";
import { apiUrl } from "./urls.ts";

for (const query of ["zolty ser", "Żółty", "calwise test"]) {
  test(`searches food through the API and food D1: ${query}`, async ({ request }) => {
    const response = await request.get(`${apiUrl}/trpc/food.search`, {
      params: { input: JSON.stringify({ q: query, limit: 1 }) },
    });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toMatchObject({
      result: {
        data: {
          products: [
            {
              barcode: "0000000000001",
              name: "Żółty ser testowy",
              carbohydrates100g: 0,
              fiber100g: null,
            },
          ],
          attribution: { license: "ODbL-1.0" },
        },
      },
    });
    expect(body.result.data.products[0]).not.toHaveProperty("id");
  });
}

test("looks up barcodes through the API and food D1", async ({ request }) => {
  const barcode = await request.get(`${apiUrl}/trpc/food.barcode`, {
    params: { input: JSON.stringify({ barcode: "0000000000001" }) },
  });
  expect(barcode.ok()).toBe(true);
  expect(await barcode.json()).toMatchObject({
    result: { data: { product: { barcode: "0000000000001" } } },
  });
  const missing = await request.get(`${apiUrl}/trpc/food.barcode`, {
    params: { input: JSON.stringify({ barcode: "9999999999999" }) },
  });
  expect(missing.status()).toBe(404);
});
