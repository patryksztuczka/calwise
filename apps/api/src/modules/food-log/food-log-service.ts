import { Database } from "@calwise/database";
import { foodEntries, type FoodEntry } from "@calwise/database/schema";
import type { Product } from "@calwise/database/food-schema";
import { and, asc, eq, getTableColumns } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Context, Effect, Layer } from "effect";
import type { LoggedUnit, MealSlot } from "@calwise/food-rules/log";

export interface EntryAmount {
  readonly amount: number;
  readonly unit: LoggedUnit;
}
export interface Destination {
  readonly date: string;
  readonly meal: MealSlot;
}
export type Entry = Omit<FoodEntry, "userId">;
const { userId: _userId, ...publicColumns } = getTableColumns(foodEntries);

const owned = (userId: string, id: string) =>
  and(eq(foodEntries.userId, userId), eq(foodEntries.id, id));

export class FoodLogService extends Context.Service<
  FoodLogService,
  {
    readonly day: (
      userId: string,
      date: string,
    ) => Effect.Effect<readonly Entry[], EffectDrizzleQueryError>;
    readonly get: (
      userId: string,
      id: string,
    ) => Effect.Effect<Entry | undefined, EffectDrizzleQueryError>;
    readonly add: (
      userId: string,
      id: string,
      product: Product,
      input: EntryAmount & Destination,
    ) => Effect.Effect<Entry | undefined, EffectDrizzleQueryError>;
    readonly update: (
      userId: string,
      id: string,
      input: EntryAmount & Destination,
    ) => Effect.Effect<Entry | undefined, EffectDrizzleQueryError>;
    readonly remove: (userId: string, id: string) => Effect.Effect<void, EffectDrizzleQueryError>;
  }
>()("@calwise/FoodLogService") {
  static readonly layer = Layer.effect(
    FoodLogService,
    Effect.gen(function* () {
      const db = yield* Database;
      const get = Effect.fn("FoodLogService.get")(function* (userId: string, id: string) {
        const rows = yield* db
          .select(publicColumns)
          .from(foodEntries)
          .where(owned(userId, id))
          .limit(1);
        return rows[0];
      });
      const day = Effect.fn("FoodLogService.day")(function* (userId: string, date: string) {
        return yield* db
          .select(publicColumns)
          .from(foodEntries)
          .where(and(eq(foodEntries.userId, userId), eq(foodEntries.date, date)))
          .orderBy(asc(foodEntries.createdAt), asc(foodEntries.id));
      });
      const add = Effect.fn("FoodLogService.add")(function* (
        userId: string,
        id: string,
        product: Product,
        input: EntryAmount & Destination,
      ) {
        yield* db
          .insert(foodEntries)
          .values({
            id,
            userId,
            barcode: product.barcode,
            name: product.name,
            brands: product.brands,
            energyKcal100g: product.energyKcal100g,
            protein100g: product.protein100g,
            carbohydrates100g: product.carbohydrates100g,
            fat100g: product.fat100g,
            ...input,
            createdAt: Date.now(),
          })
          .onConflictDoNothing({ target: foodEntries.id });
        return yield* get(userId, id);
      });
      const update = Effect.fn("FoodLogService.update")(function* (
        userId: string,
        id: string,
        input: EntryAmount & Destination,
      ) {
        const rows = yield* db
          .update(foodEntries)
          .set(input)
          .where(owned(userId, id))
          .returning(publicColumns);
        return rows[0];
      });
      const remove = Effect.fn("FoodLogService.remove")(function* (userId: string, id: string) {
        yield* db.delete(foodEntries).where(owned(userId, id));
      });
      return { day, get, add, update, remove };
    }),
  );
}
