export const MACROS = ["protein", "carbs", "fat"] as const;
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;
export interface NutritionGoals {
  readonly kcal: number;
  readonly mode: "percentages" | "grams";
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
}
export const DEFAULT_GOALS: NutritionGoals = {
  kcal: 2000,
  mode: "percentages",
  protein: 25,
  carbs: 45,
  fat: 30,
};
export function goalTargets(goals: NutritionGoals) {
  const grams = (key: (typeof MACROS)[number]) =>
    goals.mode === "grams"
      ? goals[key]
      : Math.round((goals.kcal * goals[key]) / 100 / KCAL_PER_GRAM[key]);
  return { kcal: goals.kcal, protein: grams("protein"), carbs: grams("carbs"), fat: grams("fat") };
}
export function allocatedPercent(goals: NutritionGoals) {
  return goals.mode === "percentages"
    ? goals.protein + goals.carbs + goals.fat
    : ((goals.protein * 4 + goals.carbs * 4 + goals.fat * 9) / goals.kcal) * 100;
}
export function validGoals(goals: NutritionGoals) {
  if (!Number.isInteger(goals.kcal) || goals.kcal <= 0 || goals.kcal > 100000) return false;
  if (!MACROS.every((key) => Number.isFinite(goals[key]) && goals[key] >= 0)) return false;
  return goals.mode === "percentages"
    ? Math.abs(allocatedPercent(goals) - 100) < 0.000001
    : Math.abs(goals.protein * 4 + goals.carbs * 4 + goals.fat * 9 - goals.kcal) <= 8.5;
}
