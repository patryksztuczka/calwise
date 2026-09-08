import { BARCODE_PATTERN } from "@calwise/api/food-input-rules";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../lib/trpc";
import type { FoodBarcodeResult } from "./food-types";

export type LookupState =
  | { readonly status: "invalid" | "loading" | "missing" }
  | { readonly status: "failed"; readonly retry: () => void }
  | { readonly status: "found"; readonly data: FoodBarcodeResult };

export function useBarcodeLookup(code: string): LookupState {
  const valid = BARCODE_PATTERN.test(code);
  const trpc = useTRPC();
  const lookup = useQuery({
    ...trpc.food.barcode.queryOptions({ barcode: code }),
    enabled: valid,
    retry: false,
    staleTime: 60_000,
  });

  if (!valid) return { status: "invalid" };
  // A background refresh must not replace a known product with an error screen.
  if (lookup.data) return { status: "found", data: lookup.data };
  if (lookup.isPending) return { status: "loading" };
  if (lookup.error?.data?.code === "NOT_FOUND") return { status: "missing" };
  return { status: "failed", retry: () => void lookup.refetch() };
}
