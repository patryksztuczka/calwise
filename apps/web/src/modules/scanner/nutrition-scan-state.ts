import {
  PERSONAL_PRODUCT_NUTRIENT_KEYS,
  type PersonalProductDraft,
  type PersonalProductDraftField,
} from "@calwise/food-rules/personal-product";
import type { ParsedNutritionLabel } from "./nutrition-label-parser";

export type TouchedProductField = PersonalProductDraftField | "nutritionBasis";

export interface ReadingConfirmation {
  readonly fingerprint: string | null;
  readonly matches: number;
  readonly captured: ParsedNutritionLabel | null;
}

function readingFingerprint(reading: ParsedNutritionLabel) {
  return JSON.stringify({
    basis: reading.basis,
    values: Object.entries(reading.values).toSorted(([left], [right]) => left.localeCompare(right)),
    issues: reading.issues.map(({ kind, field }) => [kind, field ?? null]),
  });
}

/** Confirm only exact, safe readings. A changed or unsafe read starts the gate over. */
export function advanceReadingConfirmation(
  current: ReadingConfirmation,
  reading: ParsedNutritionLabel,
  requiredMatches = 2,
): ReadingConfirmation {
  if (!reading.canPrefill) return { fingerprint: null, matches: 0, captured: null };
  const fingerprint = readingFingerprint(reading);
  const matches = current.fingerprint === fingerprint ? current.matches + 1 : 1;
  return {
    fingerprint,
    matches,
    captured: matches >= requiredMatches ? reading : null,
  };
}

/** Mean absolute difference between tiny grayscale signatures made in the browser. */
export function frameDifference(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length || left.length === 0) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    total += Math.abs(left[index]! - right[index]!);
  }
  return total / left.length;
}

export type NutritionCaptureMergeResult =
  | { readonly ok: true; readonly draft: PersonalProductDraft }
  | { readonly ok: false; readonly reason: "basis-conflict" };

/** Count nutrient fields that a successful capture actually changed. */
export function countCopiedNutritionValues(
  before: PersonalProductDraft,
  after: PersonalProductDraft,
) {
  return PERSONAL_PRODUCT_NUTRIENT_KEYS.filter((field) => before[field] !== after[field]).length;
}

/** Merge a confirmed scan only when doing so cannot relabel existing nutrition. */
export function mergeNutritionCapture(
  draft: PersonalProductDraft,
  capture: ParsedNutritionLabel,
  touched: ReadonlySet<TouchedProductField>,
): NutritionCaptureMergeResult {
  const hasNutrition = PERSONAL_PRODUCT_NUTRIENT_KEYS.some((field) => draft[field].trim() !== "");
  const basisConflicts =
    capture.basis !== undefined &&
    capture.basis !== draft.nutritionBasis &&
    (touched.has("nutritionBasis") || hasNutrition);
  if (basisConflicts || capture.basis === undefined) {
    return { ok: false, reason: "basis-conflict" };
  }

  const next = { ...draft, nutritionBasis: capture.basis };
  for (const field of PERSONAL_PRODUCT_NUTRIENT_KEYS) {
    const value = capture.values[field];
    if (value !== undefined && !touched.has(field) && draft[field].trim() === "") {
      next[field] = value;
    }
  }
  return { ok: true, draft: next };
}
