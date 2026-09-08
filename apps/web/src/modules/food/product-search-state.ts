import type { UseQueryResult } from "@tanstack/react-query";
import type { FoodSearchResult } from "./food-types";

export type ProductSearchState =
  | { readonly status: "idle" | "invalid" | "loading" | "failed" }
  | { readonly status: "empty"; readonly attribution: FoodSearchResult["attribution"] }
  | { readonly status: "results"; readonly data: FoodSearchResult; readonly capped: boolean };

type SearchQuery = Pick<UseQueryResult<FoodSearchResult>, "data" | "status">;

export function deriveProductSearchState(
  {
    term,
    valid,
    settled,
    limit,
  }: {
    readonly term: string;
    readonly valid: boolean;
    readonly settled: boolean;
    readonly limit: number;
  },
  search: SearchQuery,
): ProductSearchState {
  if (!term) return { status: "idle" };
  if (!valid) return { status: "invalid" };
  if (!settled) return { status: "loading" };
  // Cached results remain visible during refresh, even if that refresh fails.
  if (search.data) {
    if (search.data.products.length === 0)
      return { status: "empty", attribution: search.data.attribution };
    // The API provides no total count. Reaching the request limit only suggests
    // truncation; exactly this many matches also counts as capped.
    return { status: "results", data: search.data, capped: search.data.products.length >= limit };
  }
  if (search.status === "error") return { status: "failed" };
  return { status: "loading" };
}
