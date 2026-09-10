export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
export const LOGGED_UNITS = ["g", "ml"] as const;
export type LoggedUnit = (typeof LOGGED_UNITS)[number];
export interface Destination {
  readonly date: string;
  readonly meal: MealSlot;
}
export interface Portion {
  readonly amount: number;
  readonly unit: LoggedUnit;
}
/** Everything about an entry a user can change after it was captured. */
export type EntryChange = Portion & Destination;
export const DEFAULT_TARGETS = { kcal: 2000, protein: 125, carbs: 225, fat: 67 } as const;
export const MEAL_NAMES: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

export function isLogDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isLoggableDate(date: string, today: string): boolean {
  return isLogDate(date) && date <= today;
}

/** Reads a typed amount; accepts a decimal point or comma, nothing else. */
export function parseAmount(text: string): number | null {
  return /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text) ? Number(text.replace(",", ".")) : null;
}

export function isValidPortion(basis: NutritionBasis, amount: number): boolean {
  return (
    amount > 0 &&
    Number.isFinite(amount) &&
    Object.values(entryNutrition(basis, amount)).every(Number.isFinite)
  );
}

export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Local calendar date at noon, safe from DST shifts when adding days. */
export function parseLocalDate(date: string): Date {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function dateInZone(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export interface NutritionBasis {
  readonly energyKcal100g: number;
  readonly protein100g: number;
  readonly carbohydrates100g: number;
  readonly fat100g: number;
}

export interface Nutrition {
  readonly kcal: number;
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
}

const NUTRITION_KEYS = ["kcal", "protein", "carbs", "fat"] as const;

export function entryNutrition(basis: NutritionBasis, amount: number): Nutrition {
  const factor = amount / 100;
  return {
    kcal: basis.energyKcal100g * factor,
    protein: basis.protein100g * factor,
    carbs: basis.carbohydrates100g * factor,
    fat: basis.fat100g * factor,
  };
}

/** Totals sum unrounded values; rounding is for display only. */
export function sumNutrition(
  entries: readonly (NutritionBasis & { readonly amount: number })[],
): Nutrition {
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const entry of entries) {
    const nutrition = entryNutrition(entry, entry.amount);
    for (const key of NUTRITION_KEYS) total[key] += nutrition[key];
  }
  return total;
}
