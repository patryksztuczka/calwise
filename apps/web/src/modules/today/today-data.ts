export type MacroKey = "protein" | "carbs" | "fat";

export interface MacroIntake {
  readonly key: MacroKey;
  readonly label: string;
  /** Grams consumed so far today. */
  readonly consumed: number;
  /** Daily target in grams. */
  readonly target: number;
}

export type MealIcon = "zap" | "utensils" | "apple" | "moon";

export interface LoggedMeal {
  readonly id: string;
  readonly name: string;
  readonly icon: MealIcon;
  /** Short summary of the foods logged in this meal. */
  readonly foods: string;
  readonly kcal: number;
}

export interface DailyLog {
  /** Calendar day in ISO format (YYYY-MM-DD). */
  readonly date: string;
  readonly caloriesEaten: number;
  readonly calorieGoal: number;
  readonly macros: readonly MacroIntake[];
  readonly meals: readonly LoggedMeal[];
}

/** Mock data matching the "Calwise · Today" design frame. Replace with the daily log query once the API exists. */
export const mockDailyLog: DailyLog = {
  date: "2026-06-15",
  caloriesEaten: 1450,
  calorieGoal: 2000,
  macros: [
    { key: "protein", label: "Protein", consumed: 90, target: 125 },
    { key: "carbs", label: "Carbs", consumed: 160, target: 225 },
    { key: "fat", label: "Fat", consumed: 50, target: 67 },
  ],
  meals: [
    {
      id: "breakfast",
      name: "Breakfast",
      icon: "zap",
      foods: "Oats, banana & peanut butter",
      kcal: 420,
    },
    { id: "lunch", name: "Lunch", icon: "utensils", foods: "Chicken & avocado bowl", kcal: 630 },
    { id: "snacks", name: "Snacks", icon: "apple", foods: "Greek yogurt & almonds", kcal: 400 },
  ],
};
