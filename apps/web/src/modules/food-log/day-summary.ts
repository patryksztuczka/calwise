import { entryNutrition, MEAL_NAMES, MEAL_SLOTS } from "@calwise/food-rules/log";
import type { DailyLog, MealIcon } from "../today/today-data";
import type { FoodEntry } from "./log-types";

const icons = {
  breakfast: "zap",
  lunch: "utensils",
  dinner: "moon",
  snacks: "apple",
} satisfies Record<string, MealIcon>;
export function sumEntries(entries: readonly FoodEntry[]) {
  return entries.reduce(
    (sum, entry) => {
      const nutrition = entryNutrition(entry, entry.amount);
      return {
        kcal: sum.kcal + nutrition.kcal,
        protein: sum.protein + nutrition.protein,
        carbs: sum.carbs + nutrition.carbs,
        fat: sum.fat + nutrition.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
export function daySummary(date: string, entries: readonly FoodEntry[]): DailyLog {
  const totals = sumEntries(entries);
  return {
    date,
    caloriesEaten: totals.kcal,
    calorieGoal: 2000,
    macros: [
      { key: "protein", label: "Protein", consumed: totals.protein, target: 125 },
      { key: "carbs", label: "Carbs", consumed: totals.carbs, target: 225 },
      { key: "fat", label: "Fat", consumed: totals.fat, target: 67 },
    ],
    meals: MEAL_SLOTS.map((meal) => {
      const items = entries.filter((entry) => entry.meal === meal);
      return {
        id: meal,
        name: MEAL_NAMES[meal],
        icon: icons[meal],
        foods: items.length ? items.map((entry) => entry.name).join(", ") : "Add food",
        kcal: sumEntries(items).kcal,
      };
    }),
  };
}
