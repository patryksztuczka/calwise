/** Shared personal-product contract values used by the browser and API. */
export const NUTRITION_BASES = ["g", "ml"] as const;
export type NutritionBasisUnit = (typeof NUTRITION_BASES)[number];

export const PERSONAL_PRODUCT_PAGE_SIZE = 20;
export const PERSONAL_PRODUCT_TEXT_MAX_LENGTH = 200;

export const PERSONAL_PRODUCT_NUTRIENT_KEYS = [
  "energyKcal100",
  "energyKj100",
  "protein100",
  "carbohydrates100",
  "fat100",
  "saturatedFat100",
  "sugars100",
  "fiber100",
  "salt100",
  "sodium100",
] as const;

export type PersonalProductNutrientKey = (typeof PERSONAL_PRODUCT_NUTRIENT_KEYS)[number];

export interface PersonalProduct {
  readonly source: "personal";
  readonly id: string;
  readonly barcode: string | null;
  readonly name: string;
  readonly brand: string | null;
  readonly packageQuantity: string | null;
  readonly servingSize: string | null;
  readonly nutritionBasis: NutritionBasisUnit;
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

export type ProductReference =
  | { readonly source: "catalog"; readonly barcode: string }
  | { readonly source: "personal"; readonly id: string };

/** Reads a label number. A blank is unknown; decimal points and commas are accepted. */
export function parseNutritionNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "" || !/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
}
