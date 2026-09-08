import { isFoodSearchQuery } from "@calwise/food-rules";
import type { UseQueryResult } from "@tanstack/react-query";
import type { FoodSearchResult } from "./food-types";

export type ProductSearchState =
  | { readonly status: "idle" | "invalid" | "loading" | "failed" }
  | { readonly status: "empty"; readonly attribution: FoodSearchResult["attribution"] }
  | { readonly status: "results"; readonly data: FoodSearchResult };

type SearchQuery = Pick<UseQueryResult<FoodSearchResult>, "data" | "status">;

export function deriveProductSearchState(
  term: string,
  settled: boolean,
  search: SearchQuery,
): ProductSearchState {
  if (!term) return { status: "idle" };
  if (!isFoodSearchQuery(term)) return { status: "invalid" };
  if (!settled) return { status: "loading" };
  // Cached results remain visible during refresh, even if that refresh fails.
  if (search.data) {
    if (search.data.products.length === 0)
      return { status: "empty", attribution: search.data.attribution };
    return { status: "results", data: search.data };
  }
  if (search.status === "error") return { status: "failed" };
  return { status: "loading" };
}
