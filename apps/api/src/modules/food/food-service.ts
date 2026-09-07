import { FoodDatabase } from "@calwise/database";
import { products, publicProductColumns, type Product } from "@calwise/database/food-schema";
import { asc, eq, sql } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Context, Effect, Layer, Schema } from "effect";

export const FoodSearchInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    q: Schema.Trim.check(
      Schema.isMinLength(2),
      Schema.isMaxLength(100),
      Schema.isPattern(/[\p{L}\p{N}]/u),
    ),
    limit: Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 50 })).pipe(
      Schema.withDecodingDefaultKey(Effect.succeed(20)),
    ),
  }),
);

export const FoodBarcodeInput = Schema.toStandardSchemaV1(
  Schema.Struct({ barcode: Schema.String.check(Schema.isPattern(/^\d{4,24}$/)) }),
);

/** Literal AND-prefix search. User input never becomes FTS operators or SQL. */
export const searchExpression = (query: string) => {
  const tokens = query.replace(/[łŁ]/g, "l").match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) ?? [];
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
        return yield* db
          .select(publicProductColumns)
          .from(products)
          .where(sql`${products.id} IN (
        SELECT rowid FROM products_fts WHERE products_fts MATCH ${expression}
      )`)
          .orderBy(asc(products.name), asc(products.barcode))
          .limit(limit);
      });
      const barcode = Effect.fn("FoodService.barcode")(function* (code: string) {
        const rows = yield* db
          .select(publicProductColumns)
          .from(products)
          .where(eq(products.barcode, code))
          .limit(1);
        return rows[0];
      });
      return { search, barcode };
    }),
  );
}
