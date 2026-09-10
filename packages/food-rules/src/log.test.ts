import { describe, expect, it } from "vitest";
import {
  dateInZone,
  entryNutrition,
  isLogDate,
  isLoggableDate,
  isValidPortion,
  localDate,
  parseAmount,
  parseLocalDate,
  sumNutrition,
} from "./log.js";

const basis = { energyKcal100g: 350, protein100g: 25, carbohydrates100g: 2, fat100g: 25 };

describe("log dates", () => {
  it.each(["2024-02-29", "2000-02-29", "2026-12-31", "0001-01-01"])("accepts %s", (date) => {
    expect(isLogDate(date)).toBe(true);
  });
  it.each([
    "2026-02-29",
    "1900-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-01",
    "2026-01-00",
    "2026-1-01",
    "2026-01-01T00:00:00Z",
    "",
  ])("rejects %s", (date) => {
    expect(isLogDate(date)).toBe(false);
  });
  it("accepts today and past dates, but not tomorrow or invalid dates", () => {
    expect(isLoggableDate("2026-01-01", "2026-01-02")).toBe(true);
    expect(isLoggableDate("2026-01-02", "2026-01-02")).toBe(true);
    expect(isLoggableDate("2026-01-03", "2026-01-02")).toBe(false);
    expect(isLoggableDate("2025-02-30", "2026-01-02")).toBe(false);
  });
  it("advances the server cutoff at midnight in UTC+14", () => {
    expect(dateInZone("Pacific/Kiritimati", new Date("2025-12-31T09:59:59Z"))).toBe("2025-12-31");
    expect(dateInZone("Pacific/Kiritimati", new Date("2025-12-31T10:00:00Z"))).toBe("2026-01-01");
  });
  it("formats device-local calendar fields", () => {
    expect(localDate(new Date(2026, 0, 2, 23))).toBe("2026-01-02");
  });
  it("parses a date string back to local noon so day arithmetic survives DST", () => {
    const parsed = parseLocalDate("2026-03-29");
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours()]).toEqual([
      2026, 2, 29, 12,
    ]);
    parsed.setDate(parsed.getDate() + 1);
    expect(localDate(parsed)).toBe("2026-03-30");
  });
});

describe("portions", () => {
  it("scales captured nutrition without rounding", () => {
    expect(entryNutrition(basis, 50.5)).toEqual({
      kcal: 176.75,
      protein: 12.625,
      carbs: 1.01,
      fat: 12.625,
    });
    expect(isValidPortion(basis, 50.5)).toBe(true);
  });
  it.each([0, -1, NaN, Infinity, -Infinity, Number.MAX_VALUE])(
    "rejects invalid or overflowing amount %s",
    (amount) => {
      expect(isValidPortion(basis, amount)).toBe(false);
    },
  );
  it("sums unrounded nutrition across entries", () => {
    expect(sumNutrition([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
    expect(
      sumNutrition([
        { ...basis, amount: 50.5 },
        { ...basis, amount: 49.5 },
      ]),
    ).toEqual({
      kcal: 350,
      protein: 25,
      carbs: 2,
      fat: 25,
    });
  });
  it.each([
    ["100", 100],
    ["50.5", 50.5],
    ["50,5", 50.5],
    ["5.", 5],
    [".5", 0.5],
  ])("parses the typed amount %s", (text, amount) => {
    expect(parseAmount(text)).toBe(amount);
  });
  it.each(["", " 100", "1e5", "-1", "1.2.3", "abc", "100g"])("rejects typed amount %s", (text) => {
    expect(parseAmount(text)).toBeNull();
  });
  it("checks every calculated nutrient", () => {
    for (const key of Object.keys(basis)) {
      expect(isValidPortion({ ...basis, [key]: Infinity }, 100)).toBe(false);
    }
  });
  it("allows zero-nutrition foods and small positive portions", () => {
    expect(
      isValidPortion({ energyKcal100g: 0, protein100g: 0, carbohydrates100g: 0, fat100g: 0 }, 100),
    ).toBe(true);
    expect(isValidPortion(basis, 0.01)).toBe(true);
  });
});
