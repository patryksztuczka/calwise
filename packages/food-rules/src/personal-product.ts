import { Result, Schema } from "effect";
import { BARCODE_PATTERN } from "./index.ts";

/** Shared personal-product contract values used by the browser and API. */
export const NUTRITION_BASES = ["g", "ml"] as const;
export type NutritionBasisUnit = (typeof NUTRITION_BASES)[number];

export const PERSONAL_PRODUCT_PAGE_SIZE = 20;
export const PERSONAL_PRODUCT_TEXT_MAX_LENGTH = 200;
/**
 * A cursor can contain three folded 200-character strings. NFD can expand one
 * Hangul code unit to three UTF-8 code points, so 8,000 covers the encoded JSON.
 */
export const PERSONAL_PRODUCT_CURSOR_MAX_LENGTH = 8_000;

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

const Id = Schema.String.check(Schema.isUUID());
const RequiredText = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PERSONAL_PRODUCT_TEXT_MAX_LENGTH),
);
const OptionalText = Schema.optional(
  Schema.Trim.check(Schema.isMaxLength(PERSONAL_PRODUCT_TEXT_MAX_LENGTH)),
);
const OptionalBarcode = Schema.optional(
  Schema.Trim.check(
    Schema.makeFilter((value) => value === "" || BARCODE_PATTERN.test(value), {
      title: "Enter 4 to 24 digits or leave the barcode blank",
    }),
  ),
);
const Nutrient = Schema.Number.check(Schema.isFinite(), Schema.isGreaterThanOrEqualTo(0));
const OptionalNutrient = Schema.optional(Nutrient);

const personalProductCreateFields = {
  name: RequiredText,
  brand: OptionalText,
  barcode: OptionalBarcode,
  packageQuantity: OptionalText,
  servingSize: OptionalText,
  nutritionBasis: Schema.Literals(NUTRITION_BASES),
  energyKcal100: Nutrient,
  energyKj100: OptionalNutrient,
  protein100: Nutrient,
  carbohydrates100: Nutrient,
  fat100: Nutrient,
  saturatedFat100: OptionalNutrient,
  sugars100: OptionalNutrient,
  fiber100: OptionalNutrient,
  salt100: OptionalNutrient,
  sodium100: OptionalNutrient,
};

export const PersonalProductCreateValuesSchema = Schema.Struct(personalProductCreateFields);
export type PersonalProductCreateValues = typeof PersonalProductCreateValuesSchema.Type;

export const PersonalProductCreateSchema = Schema.Struct({
  requestId: Id,
  ...personalProductCreateFields,
});
export type PersonalProductCreateInput = typeof PersonalProductCreateSchema.Type;

export const PERSONAL_PRODUCT_DRAFT_FIELDS = [
  "name",
  "brand",
  "barcode",
  "packageQuantity",
  "servingSize",
  ...PERSONAL_PRODUCT_NUTRIENT_KEYS,
] as const;
export type PersonalProductDraftField = (typeof PERSONAL_PRODUCT_DRAFT_FIELDS)[number];
export type PersonalProductDraft = Readonly<Record<PersonalProductDraftField, string>> & {
  readonly nutritionBasis: NutritionBasisUnit;
};
export type PersonalProductDraftErrors = Partial<Record<PersonalProductDraftField, string>>;
export type PersonalProductDraftResult =
  | { readonly ok: true; readonly input: PersonalProductCreateValues }
  | { readonly ok: false; readonly errors: PersonalProductDraftErrors };

const nutritionDraftFields = [
  ["energyKcal100", "Calories", true],
  ["protein100", "Protein", true],
  ["carbohydrates100", "Carbohydrates", true],
  ["fat100", "Fat", true],
  ["energyKj100", "Energy", false],
  ["saturatedFat100", "Saturated fat", false],
  ["sugars100", "Sugars", false],
  ["fiber100", "Fibre", false],
  ["salt100", "Salt", false],
  ["sodium100", "Sodium", false],
] as const;

/** Reads a label number. A blank is unknown; decimal points and commas are accepted. */
export function parseNutritionNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "" || !/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Converts one browser draft into validated API values without reparsing its fields. */
export function personalProductDraftToCreateValues(
  draft: PersonalProductDraft,
): PersonalProductDraftResult {
  const errors: PersonalProductDraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Enter a product name.";
  for (const field of ["name", "brand", "packageQuantity", "servingSize"] as const) {
    if (draft[field].trim().length > PERSONAL_PRODUCT_TEXT_MAX_LENGTH) {
      errors[field] = `Use ${PERSONAL_PRODUCT_TEXT_MAX_LENGTH} characters or fewer.`;
    }
  }
  const barcode = draft.barcode.trim();
  if (barcode && !BARCODE_PATTERN.test(barcode)) {
    errors.barcode = "Enter 4 to 24 digits only.";
  }

  const nutrients: Partial<Record<PersonalProductNutrientKey, number>> = {};
  for (const [field, label, required] of nutritionDraftFields) {
    const value = draft[field].trim();
    if (!value) {
      if (required) errors[field] = `${label} is required.`;
      continue;
    }
    const parsed = parseNutritionNumber(value);
    if (parsed === null) {
      errors[field] = `Enter a nonnegative number for ${label.toLowerCase()}.`;
    } else {
      nutrients[field] = parsed;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const decoded = Schema.decodeUnknownResult(PersonalProductCreateValuesSchema)({
    name,
    brand: draft.brand.trim() || undefined,
    barcode: barcode || undefined,
    packageQuantity: draft.packageQuantity.trim() || undefined,
    servingSize: draft.servingSize.trim() || undefined,
    nutritionBasis: draft.nutritionBasis,
    ...nutrients,
  });
  if (Result.isSuccess(decoded)) return { ok: true, input: decoded.success };

  return { ok: false, errors: { name: decoded.failure.message } };
}
