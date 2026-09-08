import { DEFAULT_SEARCH_LIMIT, isFoodSearchQuery } from "@calwise/food-rules";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../lib/trpc";
import { useDebouncedValue } from "../../lib/use-debounced-value";
import { deriveProductSearchState } from "./product-search-state";

export function useProductSearch(term: string) {
  const { value, settled, flush } = useDebouncedValue(term, 300);
  const trpc = useTRPC();
  const valid = isFoodSearchQuery(term);
  const limit = DEFAULT_SEARCH_LIMIT;
  const search = useQuery({
    ...trpc.food.search.queryOptions({ q: value, limit }),
    enabled: valid && settled,
    staleTime: 60_000,
    retry: false,
  });

  return {
    state: deriveProductSearchState({ term, valid, settled, limit }, search),
    flush,
    retry: () => void search.refetch(),
  };
}
