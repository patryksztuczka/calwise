import type { FoodProduct } from "@calwise/shared/food";
import { Schema } from "effect";

const Nutrient = Schema.optional(Schema.NullOr(Schema.Finite));
const BarcodeResponse = Schema.Struct({
  status: Schema.Literals([0, 1]),
  product: Schema.optional(
    Schema.Struct({
      product_name: Schema.optional(Schema.String),
      product_name_pl: Schema.optional(Schema.String),
      brands: Schema.optional(Schema.String),
      quantity: Schema.optional(Schema.String),
      nutriments: Schema.optional(
        Schema.Struct({
          "energy-kcal_100g": Nutrient,
          "energy-kj_100g": Nutrient,
          proteins_100g: Nutrient,
          carbohydrates_100g: Nutrient,
          fat_100g: Nutrient,
        }),
      ),
    }),
  ),
});
export const parseBarcodeResponse = Schema.decodeUnknownSync(BarcodeResponse);

function nutrient(value: number | null | undefined): number | null {
  return value != null && value >= 0 ? value : null;
}
export function barcodeProduct(
  response: typeof BarcodeResponse.Type,
  code: string,
): FoodProduct | null {
  if (response.status !== 1 || !response.product) return null;
  const product = response.product;
  const name = product.product_name_pl?.trim() || product.product_name?.trim();
  if (!name) return null;
  const nutrition = product.nutriments;
  const kj = nutrient(nutrition?.["energy-kj_100g"]);
  return {
    code,
    name,
    brand: product.brands?.trim() ?? "",
    quantity: product.quantity?.trim() ?? "",
    kcal: nutrient(nutrition?.["energy-kcal_100g"]) ?? (kj === null ? null : kj / 4.184),
    protein: nutrient(nutrition?.proteins_100g),
    carbs: nutrient(nutrition?.carbohydrates_100g),
    fat: nutrient(nutrition?.fat_100g),
  };
}

export async function lookupBarcode(code: string, signal: AbortSignal) {
  const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
  url.searchParams.set("fields", "product_name,product_name_pl,brands,quantity,nutriments");
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Baza produktów jest chwilowo niedostępna.");
  return barcodeProduct(parseBarcodeResponse(await response.json()), code);
}
