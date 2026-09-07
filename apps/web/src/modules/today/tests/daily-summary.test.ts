import { describe, expect, it } from "vite-plus/test";
import { macroOverTargetNote, summarizeCalories, summarizeMacro } from "../daily-summary";

describe("summarizeCalories", () => {
  it("reports the untouched budget before anything is logged", () => {
    expect(summarizeCalories(0, 2000)).toMatchObject({
      status: "not-started",
      remaining: 2000,
      over: 0,
      percent: 0,
      progress: 0,
    });
  });

  it("rounds the percent and keeps the remainder positive while in progress", () => {
    expect(summarizeCalories(1450, 2000)).toMatchObject({
      status: "in-progress",
      remaining: 550,
      over: 0,
      percent: 73,
      progress: 0.725,
    });
  });

  it("treats an exact match as the goal being met", () => {
    expect(summarizeCalories(2000, 2000)).toMatchObject({
      status: "goal-met",
      remaining: 0,
      over: 0,
      percent: 100,
      progress: 1,
    });
  });

  it("shows the excess as a positive number instead of a negative remainder", () => {
    expect(summarizeCalories(2300, 2000)).toMatchObject({
      status: "over",
      remaining: 0,
      over: 300,
      percent: 115,
      progress: 1,
    });
  });
});

describe("summarizeMacro", () => {
  const protein = { key: "protein", label: "Protein", consumed: 150, target: 125 } as const;

  it("caps the bar at the track while keeping the excess visible", () => {
    expect(summarizeMacro(protein)).toMatchObject({ progress: 1, over: 25 });
  });

  it("has no excess below the target", () => {
    expect(summarizeMacro({ ...protein, consumed: 90 })).toMatchObject({
      progress: 0.72,
      over: 0,
    });
  });
});

describe("macroOverTargetNote", () => {
  const macros = [
    summarizeMacro({ key: "protein", label: "Protein", consumed: 150, target: 125 }),
    summarizeMacro({ key: "carbs", label: "Carbs", consumed: 245, target: 225 }),
    summarizeMacro({ key: "fat", label: "Fat", consumed: 80, target: 67 }),
  ];

  it("is silent while every macro is within its target", () => {
    expect(macroOverTargetNote([summarizeMacro({ ...macros[0]!, consumed: 90 })])).toBeNull();
  });

  it("names the single macro that is over", () => {
    expect(macroOverTargetNote([macros[0]!])).toBe("Protein is 25 g over its 125 g target.");
  });

  it("lists every macro that is over", () => {
    expect(macroOverTargetNote(macros)).toBe(
      "Over target: protein +25 g · carbs +20 g · fat +13 g",
    );
  });
});
