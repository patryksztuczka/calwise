// Fixed sample day from the Pen design. Nothing here is fetched or persisted.
export const mockToday = {
  date: "2026-06-15",
  calorieGoal: 2000,
  macros: [
    { name: "Protein", consumed: 90, goal: 125 },
    { name: "Carbs", consumed: 160, goal: 225 },
    { name: "Fat", consumed: 50, goal: 67 },
  ],
  meals: [
    { id: "breakfast", name: "Breakfast", foods: "Oats, banana & peanut butter", calories: 420 },
    { id: "lunch", name: "Lunch", foods: "Chicken & avocado bowl", calories: 630 },
    { id: "snacks", name: "Snacks", foods: "Greek yogurt & almonds", calories: 400 },
  ],
};

export function energySummary(consumed: number, goal: number) {
  return {
    difference: Math.abs(goal - consumed),
    overGoal: consumed > goal,
    percent: goal > 0 ? Math.round((consumed / goal) * 100) : 0,
    progress: goal > 0 ? Math.min(Math.max(consumed / goal, 0), 1) : 0,
  };
}
