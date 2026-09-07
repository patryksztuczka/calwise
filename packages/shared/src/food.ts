import { Schema } from "effect";

export const FoodSearchInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    query: Schema.String.check(Schema.isMinLength(2), Schema.isMaxLength(100)),
    page: Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 50 })),
  }),
);

export interface FoodProduct {
  readonly code: string;
  readonly name: string;
  readonly brand: string;
  readonly quantity: string;
  readonly kcal: number | null;
  readonly protein: number | null;
  readonly carbs: number | null;
  readonly fat: number | null;
}

export interface FoodSearchResult {
  readonly products: readonly FoodProduct[];
  readonly page: number;
  readonly hasMore: boolean;
}

export function portionValue(value: number | null, amount: number): number | null {
  return value === null || !Number.isFinite(amount) || amount <= 0 ? null : (value * amount) / 100;
}
