import { describe, expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { energySummary, mockToday } from "./mock-today";
import { TodayScreen } from "./today-screen";

describe("Today", () => {
  it("derives the designed calorie summary from logged mock meals", () => {
    const consumed = mockToday.meals.reduce((total, meal) => total + meal.calories, 0);
    expect(consumed).toBe(1450);
    expect(energySummary(consumed, mockToday.calorieGoal)).toEqual({
      difference: 550,
      overGoal: false,
      percent: 73,
      progress: 0.725,
    });
  });

  it("caps the gauge and reports calories over the goal", () => {
    expect(energySummary(2250, 2000)).toEqual({
      difference: 250,
      overGoal: true,
      percent: 113,
      progress: 1,
    });
    expect(energySummary(2000, 2000).difference).toBe(0);
    expect(energySummary(0, 2000).progress).toBe(0);
    expect(energySummary(0, 0).percent).toBe(0);
  });

  it("renders meals, accessible totals, and a link to the existing food prototype", () => {
    const html = renderToStaticMarkup(createElement(TodayScreen));
    expect(html).toContain("1,450 kilocalories eaten. 550 kilocalories left.");
    for (const meal of mockToday.meals) expect(html).toContain(meal.name);
    expect(html).toContain('href="/food"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-label="Protein: 90 of 125 grams"');
    expect(html).toContain('dateTime="2026-06-15"');
  });
});
