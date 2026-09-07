import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { app } from "../app.ts";
import { FoodService, searchExpression } from "../modules/food/food-service.ts";
import searchContract from "../../../../tools/open-food-facts/fixtures/search.json" with { type: "json" };
import { testEnv } from "./test-env.ts";

const searchFoods = vi.fn((_query: string, _limit: number) => Effect.succeed([]));
const testLayer = Layer.succeed(FoodService, {
  search: searchFoods,
  barcode: () => Effect.succeed(undefined),
});
const env = testEnv(testLayer);

const search = (q: string, limit?: number) =>
  app.request(
    `/trpc/food.search?input=${encodeURIComponent(JSON.stringify({ q, limit }))}`,
    undefined,
    env,
  );
const barcode = (code: string) =>
  app.request(
    `/trpc/food.barcode?input=${encodeURIComponent(JSON.stringify({ barcode: code }))}`,
    undefined,
    env,
  );

describe("food API", () => {
  it.each(searchContract.queries)(
    "builds the SQLite contract expression for $query",
    ({ query, expression }) => {
      expect(searchExpression(query)).toBe(expression);
    },
  );
  it("treats FTS syntax as literal words", () => {
    expect(searchExpression('ser OR "mleko"*')).toBe('"ser"* AND "OR"* AND "mleko"*');
  });
  it("returns empty search results with attribution without a session", async () => {
    const response = await search("  ser  ");
    expect(response.status).toBe(200);
    expect(searchFoods).toHaveBeenLastCalledWith("ser", 20);
    expect(await response.json()).toMatchObject({
      result: { data: { products: [], attribution: { license: "ODbL-1.0" } } },
    });
  });
  it.each([1, 50])("passes a valid limit %s to the service", async (limit) => {
    expect((await search("ser", limit)).status).toBe(200);
    expect(searchFoods).toHaveBeenLastCalledWith("ser", limit);
  });
  it("hides database failure details", async () => {
    const input = encodeURIComponent(JSON.stringify({ q: "ser" }));
    const response = await app.request(`/trpc/food.search?input=${input}`, undefined, {
      ...env,
      run: async () => {
        throw new Error("private SQL failure");
      },
    });
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain("internal server error");
    expect(body).not.toContain("private SQL failure");
  });
  it.each(["", "a", "***", "  a  ", "x".repeat(101)])("rejects invalid query %s", async (q) => {
    expect((await search(q)).status).toBe(400);
  });
  it.each([0, 51, 1.5])("rejects invalid limit %s", async (limit) => {
    expect((await search("ser", limit)).status).toBe(400);
  });
  it("rejects missing input and string limits", async () => {
    expect((await app.request("/trpc/food.search", undefined, env)).status).toBe(400);
    const input = encodeURIComponent(JSON.stringify({ q: "ser", limit: "NaN" }));
    expect((await app.request(`/trpc/food.search?input=${input}`, undefined, env)).status).toBe(
      400,
    );
  });
  it("returns 404 for unknown barcodes and 400 for malformed ones", async () => {
    expect((await barcode("00012345")).status).toBe(404);
    expect((await barcode("abc")).status).toBe(400);
  });
});
