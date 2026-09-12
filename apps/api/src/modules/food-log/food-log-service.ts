import { Database } from "@calwise/database";
import { foodEntries, publicFoodEntryColumns, type FoodEntry } from "@calwise/database/schema";
import type { NutritionBasisUnit } from "@calwise/food-rules/personal-product";
import { and, asc, eq } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Context, Effect, Layer } from "effect";
import type { EntryChange } from "@calwise/food-rules/log";
export type Entry = Omit<FoodEntry, "userId">;

export interface CapturedProduct {
  readonly productSource: "catalog" | "personal";
  readonly personalProductId: string | null;
  readonly nutritionBasis: NutritionBasisUnit | null;
  readonly barcode: string | null;
  readonly name: string;
  readonly brands: string | null;
  readonly energyKcal100g: number;
  readonly energyKj100g: number | null;
  readonly protein100g: number;
  readonly carbohydrates100g: number;
  readonly fat100g: number;
  readonly saturatedFat100g: number | null;
  readonly sugars100g: number | null;
  readonly fiber100g: number | null;
  readonly salt100g: number | null;
  readonly sodium100g: number | null;
}

/** Only these four columns change after capture; nothing else from a request reaches the row. */
const entryChange = ({ amount, unit, date, meal }: EntryChange) => ({ amount, unit, date, meal });
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
      product: CapturedProduct,
      change: EntryChange,
    ) => Effect.Effect<Entry | undefined, EffectDrizzleQueryError>;
    readonly update: (
      userId: string,
      id: string,
      change: EntryChange,
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
          .select(publicFoodEntryColumns)
          .from(foodEntries)
          .where(owned(userId, id))
          .limit(1);
        return rows[0];
      });
      const day = Effect.fn("FoodLogService.day")(function* (userId: string, date: string) {
        return yield* db
          .select(publicFoodEntryColumns)
          .from(foodEntries)
          .where(and(eq(foodEntries.userId, userId), eq(foodEntries.date, date)))
          .orderBy(asc(foodEntries.createdAt), asc(foodEntries.id));
      });
      const add = Effect.fn("FoodLogService.add")(function* (
        userId: string,
        id: string,
        product: CapturedProduct,
        change: EntryChange,
      ) {
        yield* db
          .insert(foodEntries)
          .values({
            id,
            userId,
            barcode: product.barcode,
            productSource: product.productSource,
            personalProductId: product.personalProductId,
            nutritionBasis: product.nutritionBasis,
            name: product.name,
            brands: product.brands,
            energyKcal100g: product.energyKcal100g,
            energyKj100g: product.energyKj100g,
            protein100g: product.protein100g,
            carbohydrates100g: product.carbohydrates100g,
            fat100g: product.fat100g,
            saturatedFat100g: product.saturatedFat100g,
            sugars100g: product.sugars100g,
            fiber100g: product.fiber100g,
            salt100g: product.salt100g,
            sodium100g: product.sodium100g,
            ...entryChange(change),
            createdAt: Date.now(),
          })
          .onConflictDoNothing({ target: foodEntries.id });
        return yield* get(userId, id);
      });
      const update = Effect.fn("FoodLogService.update")(function* (
        userId: string,
        id: string,
        change: EntryChange,
      ) {
        const rows = yield* db
          .update(foodEntries)
          .set(entryChange(change))
          .where(owned(userId, id))
          .returning(publicFoodEntryColumns);
        return rows[0];
      });
      const remove = Effect.fn("FoodLogService.remove")(function* (userId: string, id: string) {
        yield* db.delete(foodEntries).where(owned(userId, id));
      });
      return { day, get, add, update, remove };
    }),
  );
}
