import { DEFAULT_SEARCH_LIMIT, isFoodSearchQuery } from "@calwise/api/food-input-rules";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../lib/trpc";
import { useDebouncedValue } from "../../lib/use-debounced-value";
import type { FoodSearchResult } from "./food-types";

export const LIMIT = DEFAULT_SEARCH_LIMIT;

export type ProductSearchState =
  | { readonly status: "idle" | "invalid" | "loading" }
  | { readonly status: "failed"; readonly retry: () => void }
  | { readonly status: "empty"; readonly attribution: FoodSearchResult["attribution"] }
  | { readonly status: "results"; readonly data: FoodSearchResult; readonly query: string };

export function useProductSearch(term: string) {
  const { value, settled, flush } = useDebouncedValue(term, 300);
  const valid = isFoodSearchQuery(term);
  const trpc = useTRPC();
  const search = useQuery({
    ...trpc.food.search.queryOptions({ q: value, limit: LIMIT }),
    enabled: valid && settled,
    staleTime: 60_000,
    retry: false,
  });

  function state(): ProductSearchState {
    if (!term) return { status: "idle" };
    if (!valid) return { status: "invalid" };
    if (!settled) return { status: "loading" };
    // Cached results remain visible during refresh, even if that refresh fails.
    if (search.data) {
      if (search.data.products.length === 0)
        return { status: "empty", attribution: search.data.attribution };
      return { status: "results", data: search.data, query: value };
    }
    if (search.isError) return { status: "failed", retry: () => void search.refetch() };
    return { status: "loading" };
  }

  return { state: state(), flush };
}
