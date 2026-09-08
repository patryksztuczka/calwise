import { BARCODE_PATTERN } from "@calwise/food-rules";
import type { QueryStatus } from "@tanstack/react-query";
import type { FoodBarcodeResult } from "./food-types";

export type LookupState =
  | { readonly status: "invalid" | "loading" | "missing" | "failed" }
  | { readonly status: "found"; readonly data: FoodBarcodeResult };

interface LookupQuery {
  readonly status: QueryStatus;
  readonly data: FoodBarcodeResult | undefined;
  readonly errorCode: string | undefined;
}

export function deriveLookupState(code: string, lookup: LookupQuery): LookupState {
  if (!BARCODE_PATTERN.test(code)) return { status: "invalid" };
  // A background refresh must not replace a known product with an error screen.
  if (lookup.data) return { status: "found", data: lookup.data };
  if (lookup.status === "pending") return { status: "loading" };
  if (lookup.errorCode === "NOT_FOUND") return { status: "missing" };
  return { status: "failed" };
}
