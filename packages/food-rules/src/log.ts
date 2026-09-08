export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
export type LoggedUnit = "g" | "ml";
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

export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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

export function entryNutrition(basis: NutritionBasis, amount: number) {
  const factor = amount / 100;
  return {
    kcal: basis.energyKcal100g * factor,
    protein: basis.protein100g * factor,
    carbs: basis.carbohydrates100g * factor,
    fat: basis.fat100g * factor,
  };
}
