import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { app } from "./app.ts";
import { FoodService, searchExpression } from "./food-service.ts";

const testLayer = Layer.succeed(FoodService, {
  search: () => Effect.succeed([]),
  barcode: () => Effect.succeed(undefined),
});
const env = {
  run: <A, E>(effect: Effect.Effect<A, E, FoodService>) =>
    Effect.runPromise(effect.pipe(Effect.provide(testLayer))),
};

describe("food API", () => {
  it("normalizes Polish text and treats FTS syntax as literal words", () => {
    expect(searchExpression("Żółty ŁACIATE")).toBe('"zolty"* AND "laciate"*');
    expect(searchExpression('ser OR "mleko"*')).toBe('"ser"* AND "or"* AND "mleko"*');
  });
  it("returns empty search results with attribution", async () => {
    const response = await app.request("/foods/search?q=ser", undefined, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      products: [],
      attribution: { license: "ODbL-1.0" },
    });
  });
  it.each([
    "",
    "?q=a",
    "?q=***",
    `?q=${"x".repeat(101)}`,
    "?q=ser&limit=0",
    "?q=ser&limit=51",
    "?q=ser&limit=1.5",
    "?q=ser&limit=NaN",
  ])("rejects invalid search %s", async (query) => {
    expect((await app.request(`/foods/search${query}`, undefined, env)).status).toBe(400);
  });
  it("returns 404 for unknown barcodes and 400 for malformed ones", async () => {
    expect((await app.request("/foods/barcode/00012345", undefined, env)).status).toBe(404);
    expect((await app.request("/foods/barcode/abc", undefined, env)).status).toBe(400);
  });
});
