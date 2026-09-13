import { describe, expect, it } from "vitest";
import {
  parseNutritionNumber,
  personalProductDraftToCreateValues,
  type PersonalProductDraft,
} from "./personal-product.ts";

const draft = (overrides: Partial<PersonalProductDraft> = {}): PersonalProductDraft => ({
  name: "  Soup  ",
  brand: "  Kitchen  ",
  barcode: "",
  packageQuantity: " 500 g ",
  servingSize: "",
  nutritionBasis: "g",
  energyKcal100: "123.456",
  energyKj100: "",
  protein100: "1,25",
  carbohydrates100: "2.5",
  fat100: "0",
  saturatedFat100: "",
  sugars100: "",
  fiber100: "",
  salt100: "",
  sodium100: "",
  ...overrides,
});

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

describe("personal product draft", () => {
  it("returns trimmed, parsed creation values in one pass", () => {
    expect(personalProductDraftToCreateValues(draft())).toEqual({
      ok: true,
      input: {
        name: "Soup",
        brand: "Kitchen",
        packageQuantity: "500 g",
        nutritionBasis: "g",
        energyKcal100: 123.456,
        protein100: 1.25,
        carbohydrates100: 2.5,
        fat100: 0,
      },
    });
  });

  it("returns field errors instead of a partial payload", () => {
    expect(
      personalProductDraftToCreateValues(
        draft({ name: " ", barcode: "123x", protein100: "", sugars100: "-1" }),
      ),
    ).toEqual({
      ok: false,
      errors: {
        name: "Enter a product name.",
        barcode: "Enter 4 to 24 digits only.",
        protein100: "Protein is required.",
        sugars100: "Enter a nonnegative number for sugars.",
      },
    });
  });
});
