import { describe, expect, it } from "@effect/vitest";
import { FoodSearchInput, portionValue } from "@calwise/shared/food";
import { Effect } from "effect";
import {
  createFoodSearch,
  FoodSearchUnavailable,
  normalizeProduct,
  searchUrl,
} from "./food-search.ts";

const product = {
  code: "12345678",
  product_name: "Yogurt",
  product_name_pl: "Jogurt naturalny",
  countries_tags: ["en:poland"],
  nutriments: { "energy-kcal_100g": 60, proteins_100g: 0 },
};

describe("Polish food search", () => {
  it("uses a country filter and safely encodes Polish queries", () => {
    const url = searchUrl("  Piątnica & skyr  ", 2);
    expect(url.searchParams.get("search_terms")).toBe("Piątnica & skyr");
    expect(url.searchParams.get("tag_0")).toBe("poland");
    expect(url.searchParams.get("tagtype_0")).toBe("countries");
    expect(url.searchParams.get("page")).toBe("2");
  });
  it("prefers Polish names and distinguishes zero from missing nutrients", () => {
    expect(normalizeProduct(product)).toMatchObject({
      name: "Jogurt naturalny",
      kcal: 60,
      protein: 0,
      carbs: null,
    });
    expect(normalizeProduct({ ...product, countries_tags: ["en:germany"] })).toBeNull();
    expect(normalizeProduct({ ...product, code: "invalid" })).toBeNull();
    expect(normalizeProduct({ ...product, product_name: "", product_name_pl: " " })).toBeNull();
  });
  it("converts kJ only when kcal is missing and discards invalid values", () => {
    const converted = normalizeProduct({
      ...product,
      nutriments: { "energy-kj_100g": 418.4, fat_100g: -1 },
    });
    expect(converted?.kcal).toBeCloseTo(100);
    expect(converted?.fat).toBeNull();
  });
  it("calculates portions without inventing missing values", () => {
    expect(portionValue(60, 150)).toBe(90);
    expect(portionValue(0, 150)).toBe(0);
    expect(portionValue(null, 150)).toBeNull();
    expect(portionValue(60, -5)).toBeNull();
    expect(portionValue(60, Number.NaN)).toBeNull();
  });
  it("rejects out-of-bounds search inputs", async () => {
    await Promise.all(
      [
        { query: "a", page: 1 },
        { query: "skyr", page: 0 },
        { query: "skyr", page: 1.5 },
        { query: "x".repeat(101), page: 1 },
      ].map(async (input) => {
        expect((await FoodSearchInput["~standard"].validate(input)).issues).toBeDefined();
      }),
    );
  });
  it.effect("decodes, deduplicates, and caches submitted searches", () =>
    Effect.gen(function* () {
      let calls = 0;
      const search = createFoodSearch(async () => {
        calls++;
        return Response.json({ products: [product, product] });
      });
      const first = yield* search("skyr", 1);
      const second = yield* search("skyr", 1);
      expect(first.products).toHaveLength(1);
      expect(second).toEqual(first);
      expect(calls).toBe(1);
      expect(first.hasMore).toBe(false);
      yield* search("skyr", 2);
      expect(calls).toBe(2);
    }),
  );
  it.effect("supports empty pages and pagination", () =>
    Effect.gen(function* () {
      const empty = createFoodSearch(async () => Response.json({ products: [] }));
      expect((yield* empty("skyr", 1)).products).toEqual([]);
      const full = createFoodSearch(async () =>
        Response.json({
          products: Array.from({ length: 20 }, (_, i) => ({ ...product, code: String(i + 1) })),
        }),
      );
      expect((yield* full("skyr", 1)).hasMore).toBe(true);
      expect((yield* full("skyr", 50)).hasMore).toBe(false);
    }),
  );
  it.effect("reports upstream errors without caching failures", () =>
    Effect.gen(function* () {
      let calls = 0;
      const search = createFoodSearch(async () => {
        calls++;
        return new Response("rate limited", { status: 429 });
      });
      expect(yield* Effect.flip(search("skyr", 1))).toBeInstanceOf(FoodSearchUnavailable);
      yield* Effect.flip(search("skyr", 1));
      expect(calls).toBe(2);
    }),
  );
  it.effect("reports malformed responses and network failures", () =>
    Effect.gen(function* () {
      const malformed = createFoodSearch(async () => Response.json({ products: "wrong" }));
      expect(yield* Effect.flip(malformed("skyr", 1))).toBeInstanceOf(FoodSearchUnavailable);
      const offline = createFoodSearch(() => Promise.reject(new Error("offline")));
      expect(yield* Effect.flip(offline("skyr", 1))).toBeInstanceOf(FoodSearchUnavailable);
    }),
  );
});
