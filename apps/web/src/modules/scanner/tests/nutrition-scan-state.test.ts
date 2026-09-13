import type { PersonalProductDraft } from "@calwise/food-rules/personal-product";
import { describe, expect, it } from "vite-plus/test";
import {
  advanceReadingConfirmation,
  countCopiedNutritionValues,
  frameDifference,
  mergeNutritionCapture,
  type ReadingConfirmation,
} from "../nutrition-scan-state";
import type { ParsedNutritionLabel } from "../nutrition-label-parser";

const safeReading: ParsedNutritionLabel = {
  basis: "ml",
  canPrefill: true,
  issues: [],
  values: { energyKcal100: "40", protein100: "0", carbohydrates100: "9.5" },
};

function emptyConfirmation(): ReadingConfirmation {
  return { fingerprint: null, matches: 0, captured: null };
}

describe("nutrition scan stability", () => {
  it("requires two identical safe OCR readings before capture", () => {
    const first = advanceReadingConfirmation(emptyConfirmation(), safeReading);
    expect(first.matches).toBe(1);
    expect(first.captured).toBeNull();

    const second = advanceReadingConfirmation(first, safeReading);
    expect(second.matches).toBe(2);
    expect(second.captured).toEqual(safeReading);
  });

  it("restarts confirmation after a changed or unsafe reading", () => {
    const first = advanceReadingConfirmation(emptyConfirmation(), safeReading);
    const changed = advanceReadingConfirmation(first, {
      ...safeReading,
      values: { ...safeReading.values, energyKcal100: "41" },
    });
    expect(changed).toMatchObject({ matches: 1, captured: null });

    const unsafe = advanceReadingConfirmation(changed, {
      values: {},
      issues: [{ kind: "missing-basis", message: "missing" }],
      canPrefill: false,
    });
    expect(unsafe).toEqual(emptyConfirmation());
  });

  it("measures local frame movement without sending pixels anywhere", () => {
    expect(frameDifference(new Uint8Array([0, 10, 20]), new Uint8Array([0, 10, 20]))).toBe(0);
    expect(frameDifference(new Uint8Array([0, 10]), new Uint8Array([10, 20]))).toBe(10);
    expect(frameDifference(new Uint8Array([0]), new Uint8Array([0, 1]))).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("mergeNutritionCapture", () => {
  const draft: PersonalProductDraft = {
    name: "Incoming name",
    brand: "Manual brand",
    barcode: "01234567",
    packageQuantity: "500 g",
    servingSize: "",
    nutritionBasis: "g",
    energyKcal100: "123",
    energyKj100: "",
    protein100: "",
    carbohydrates100: "",
    fat100: "0",
    saturatedFat100: "",
    sugars100: "",
    fiber100: "",
    salt100: "",
    sodium100: "",
  };

  it("fills blanks on the same basis without overwriting literal zero or manual corrections", () => {
    const result = mergeNutritionCapture(
      draft,
      { ...safeReading, basis: "g" },
      new Set(["nutritionBasis", "energyKcal100"]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft).toMatchObject({
      name: "Incoming name",
      brand: "Manual brand",
      barcode: "01234567",
      nutritionBasis: "g",
      energyKcal100: "123",
      protein100: "0",
      carbohydrates100: "9.5",
      fat100: "0",
    });
  });

  it.each([
    {
      name: "all",
      before: { ...draft, energyKcal100: "", fat100: "" },
      touched: new Set<"nutritionBasis">(["nutritionBasis"]),
      expected: 3,
      expectedCalories: "40",
    },
    {
      name: "part",
      before: draft,
      touched: new Set<"nutritionBasis" | "energyKcal100">(["nutritionBasis", "energyKcal100"]),
      expected: 2,
      expectedCalories: "123",
    },
    {
      name: "none",
      before: { ...draft, protein100: "1", carbohydrates100: "2" },
      touched: new Set<"nutritionBasis" | "energyKcal100" | "protein100" | "carbohydrates100">([
        "nutritionBasis",
        "energyKcal100",
        "protein100",
        "carbohydrates100",
      ]),
      expected: 0,
      expectedCalories: "123",
    },
  ])(
    "counts $name copied values from actual draft changes",
    ({ before, touched, expected, expectedCalories }) => {
      const result = mergeNutritionCapture(before, { ...safeReading, basis: "g" }, touched);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(countCopiedNutritionValues(before, result.draft)).toBe(expected);
      expect(result.draft.energyKcal100).toBe(expectedCalories);
      expect(result.draft.fat100).toBe(before.fat100);
    },
  );

  it("rejects an ml capture when the user explicitly chose g, even if every nutrient is blank", () => {
    const blank = {
      ...draft,
      energyKcal100: "",
      fat100: "",
    };
    expect(mergeNutritionCapture(blank, safeReading, new Set(["nutritionBasis"]))).toEqual({
      ok: false,
      reason: "basis-conflict",
    });
  });

  it("rejects a different basis after an earlier capture without changing existing values", () => {
    const capturedMl = {
      ...draft,
      nutritionBasis: "ml" as const,
      energyKcal100: "40",
      fat100: "",
    };
    const result = mergeNutritionCapture(
      capturedMl,
      { ...safeReading, basis: "g", values: { protein100: "8" } },
      new Set(["nutritionBasis"]),
    );
    expect(result).toEqual({ ok: false, reason: "basis-conflict" });
    expect(capturedMl).toMatchObject({ nutritionBasis: "ml", energyKcal100: "40", protein100: "" });
  });

  it("adopts a scanned basis only when no basis or nutrient has been established", () => {
    const empty = {
      ...draft,
      energyKcal100: "",
      fat100: "",
    };
    const result = mergeNutritionCapture(empty, safeReading, new Set());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.draft.nutritionBasis).toBe("ml");
  });

  it("rejects a different basis when existing nutrition would otherwise be relabelled", () => {
    expect(mergeNutritionCapture(draft, safeReading, new Set())).toEqual({
      ok: false,
      reason: "basis-conflict",
    });
  });
});
