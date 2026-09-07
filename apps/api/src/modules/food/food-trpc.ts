import { FoodSearchInput } from "@calwise/shared/food";
import { TRPCError } from "@trpc/server";
import { Effect } from "effect";
import { publicProcedure, router } from "../../http/trpc.ts";
import { searchFood } from "./food-search.ts";

export const foodRouter = router({
  search: publicProcedure.input(FoodSearchInput).query(async ({ input }) => {
    const query = input.query.trim();
    if (query.length < 2)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Wpisz co najmniej 2 znaki." });
    // This independent read-only search needs no database layer.
    const result = await Effect.runPromise(
      searchFood(query, input.page).pipe(
        Effect.map((value) => ({ ok: true as const, value })),
        Effect.catchTag("FoodSearchUnavailable", (error) =>
          Effect.succeed({ ok: false as const, message: error.message }),
        ),
      ),
    );
    if (!result.ok) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: result.message });
    return result.value;
  }),
});
