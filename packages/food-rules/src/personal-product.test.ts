import { describe, expect, it } from "vitest";
import { parseNutritionNumber } from "./personal-product.ts";

describe("personal product nutrition input", () => {
  it.each([
    ["0", 0],
    ["0,125", 0.125],
    [".5", 0.5],
    ["12.", 12],
  ])("parses %s without rounding", (text, expected) => {
    expect(parseNutritionNumber(text)).toBe(expected);
  });

  it.each(["", "  ", "-1", "1,2.3", "Infinity", "NaN"])("rejects %s", (text) => {
    expect(parseNutritionNumber(text)).toBeNull();
  });
});
