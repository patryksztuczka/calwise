import { FoodDatabase, products, type Product } from "@calwise/food-database";
import { asc, eq, sql } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Context, Effect, Layer } from "effect";

/** Literal AND-prefix search. User input never becomes FTS operators or SQL. */
export const searchExpression = (query: string) => {
  const tokens =
    query
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replaceAll("ł", "l")
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  return tokens.map((token) => `"${token}"*`).join(" AND ");
};

export class FoodService extends Context.Service<
  FoodService,
  {
    readonly search: (
      query: string,
      limit: number,
    ) => Effect.Effect<readonly Product[], EffectDrizzleQueryError>;
    readonly barcode: (
      barcode: string,
    ) => Effect.Effect<Product | undefined, EffectDrizzleQueryError>;
  }
>()("@calwise/FoodService") {
  static readonly layer = Layer.effect(
    FoodService,
    Effect.gen(function* () {
      const db = yield* FoodDatabase;
      const search = Effect.fn("FoodService.search")(function* (query: string, limit: number) {
        const expression = searchExpression(query);
        if (!expression) return [];
        return yield* db
          .select()
          .from(products)
          .where(sql`${products.id} IN (
        SELECT rowid FROM products_fts WHERE products_fts MATCH ${expression}
      )`)
          .orderBy(asc(products.name), asc(products.barcode))
          .limit(limit);
      });
      const barcode = Effect.fn("FoodService.barcode")(function* (code: string) {
        const rows = yield* db.select().from(products).where(eq(products.barcode, code)).limit(1);
        return rows[0];
      });
      return { search, barcode };
    }),
  );
}
