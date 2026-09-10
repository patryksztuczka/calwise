import { MEAL_SLOTS, sumNutrition } from "@calwise/food-rules/log";
import type { FoodEntry } from "./food-log-types";

export function daySummary(entries: readonly FoodEntry[]) {
  const meals = MEAL_SLOTS.map((meal) => {
    const own = entries.filter((entry) => entry.meal === meal);
    return {
      meal,
      kcal: sumNutrition(own).kcal,
      foods: own.map((entry) => entry.name),
    };
  });
  return { totals: sumNutrition(entries), meals, count: entries.length };
}
