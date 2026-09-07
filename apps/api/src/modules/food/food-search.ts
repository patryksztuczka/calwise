import type { FoodProduct, FoodSearchResult } from "@calwise/shared/food";
import { Effect, Schema } from "effect";

const Nutrient = Schema.optional(Schema.NullOr(Schema.Finite));
const SourceProduct = Schema.Struct({
  code: Schema.String,
  product_name: Schema.optional(Schema.String),
  product_name_pl: Schema.optional(Schema.String),
  brands: Schema.optional(Schema.String),
  quantity: Schema.optional(Schema.String),
  countries_tags: Schema.optional(Schema.Array(Schema.String)),
  nutriments: Schema.optional(
    Schema.Struct({
      "energy-kcal_100g": Nutrient,
      "energy-kj_100g": Nutrient,
      proteins_100g: Nutrient,
      carbohydrates_100g: Nutrient,
      fat_100g: Nutrient,
    }),
  ),
});
const SourceResponse = Schema.Struct({
  products: Schema.Array(SourceProduct),
});

export class FoodSearchUnavailable extends Schema.TaggedError<FoodSearchUnavailable>()(
  "FoodSearchUnavailable",
  { message: Schema.String },
) {}

function nutrient(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

export function normalizeProduct(product: typeof SourceProduct.Type): FoodProduct | null {
  const name = product.product_name_pl?.trim() || product.product_name?.trim();
  if (!name || !/^\d+$/.test(product.code) || !product.countries_tags?.includes("en:poland"))
    return null;
  const nutrition = product.nutriments;
  const kj = nutrient(nutrition?.["energy-kj_100g"]);
  return {
    code: product.code,
    name,
    brand: product.brands?.trim() ?? "",
    quantity: product.quantity?.trim() ?? "",
    kcal: nutrient(nutrition?.["energy-kcal_100g"]) ?? (kj === null ? null : kj / 4.184),
    protein: nutrient(nutrition?.proteins_100g),
    carbs: nutrient(nutrition?.carbohydrates_100g),
    fat: nutrient(nutrition?.fat_100g),
  };
}

export function searchUrl(query: string, page: number): URL {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.search = new URLSearchParams({
    search_terms: query.trim(),
    search_simple: "1",
    action: "process",
    json: "1",
    tagtype_0: "countries",
    tag_contains_0: "contains",
    tag_0: "poland",
    page: String(page),
    page_size: "20",
    fields: "code,product_name,product_name_pl,brands,quantity,countries_tags,nutriments",
  }).toString();
  return url;
}

// Submitted searches only. Bound the cache so a long-running prototype cannot grow forever.
export function createFoodSearch(fetcher: typeof fetch = fetch) {
  const cache = new Map<string, { expires: number; result: FoodSearchResult }>();
  return Effect.fn("FoodSearch.search")(function* (query: string, page: number) {
    const url = searchUrl(query, page);
    const key = url.href;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.result;
    const responseBody = yield* Effect.tryPromise({
      try: async (signal) => {
        const response = await fetcher(url, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
          headers: {
            "User-Agent": "Calwise/0.1 (Polish food search prototype)",
            Accept: "application/json",
          },
        });
        if (!response.ok) throw new Error(`Open Food Facts returned ${response.status}`);
        return response.json();
      },
      catch: () =>
        new FoodSearchUnavailable({
          message: "Nie udało się pobrać produktów. Spróbuj ponownie za chwilę.",
        }),
    });
    const source = yield* Schema.decodeUnknownEffect(SourceResponse)(responseBody).pipe(
      Effect.mapError(
        () => new FoodSearchUnavailable({ message: "Baza produktów zwróciła nieprawidłowe dane." }),
      ),
    );
    const products = source.products.map(normalizeProduct).filter((product) => product !== null);
    const result: FoodSearchResult = {
      products: [...new Map(products.map((product) => [product.code, product])).values()],
      page,
      hasMore: source.products.length === 20 && page < 50,
    };
    if (cache.size >= 100) cache.clear();
    cache.set(key, { result, expires: Date.now() + 300_000 });
    return result;
  });
}

export const searchFood = createFoodSearch();
