import { BARCODE_PATTERN } from "@calwise/food-rules";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../lib/trpc";
import { deriveLookupState } from "./barcode-lookup-state";

export function useBarcodeLookup(code: string) {
  const trpc = useTRPC();
  const lookup = useQuery({
    ...trpc.food.barcode.queryOptions({ barcode: code }),
    enabled: BARCODE_PATTERN.test(code),
    retry: false,
    staleTime: 60_000,
  });

  return {
    state: deriveLookupState(code, {
      status: lookup.status,
      data: lookup.data,
      errorCode: lookup.error?.data?.code,
    }),
    retry: () => void lookup.refetch(),
  };
}
