import { Database } from "@calwise/database";
import { nutritionGoals } from "@calwise/database/schema";
import { DEFAULT_GOALS, type NutritionGoals } from "@calwise/food-rules/goals";
import { and, desc, eq, lte } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Context, Effect, Layer } from "effect";

export class ProfileService extends Context.Service<
  ProfileService,
  {
    readonly goals: (
      userId: string,
      date: string,
    ) => Effect.Effect<NutritionGoals, EffectDrizzleQueryError>;
    readonly saveGoals: (
      userId: string,
      date: string,
      goals: NutritionGoals,
    ) => Effect.Effect<void, EffectDrizzleQueryError>;
  }
>()("@calwise/ProfileService") {
  static readonly layer = Layer.effect(
    ProfileService,
    Effect.gen(function* () {
      const db = yield* Database;
      const goals = Effect.fn("ProfileService.goals")(function* (userId: string, date: string) {
        const rows = yield* db
          .select({
            kcal: nutritionGoals.kcal,
            mode: nutritionGoals.mode,
            protein: nutritionGoals.protein,
            carbs: nutritionGoals.carbs,
            fat: nutritionGoals.fat,
          })
          .from(nutritionGoals)
          .where(and(eq(nutritionGoals.userId, userId), lte(nutritionGoals.date, date)))
          .orderBy(desc(nutritionGoals.date))
          .limit(1);
        return rows[0] ?? DEFAULT_GOALS;
      });
      const saveGoals = Effect.fn("ProfileService.saveGoals")(function* (
        userId: string,
        date: string,
        value: NutritionGoals,
      ) {
        yield* db
          .insert(nutritionGoals)
          .values({ userId, date, ...value })
          .onConflictDoUpdate({ target: [nutritionGoals.userId, nutritionGoals.date], set: value });
      });
      return { goals, saveGoals };
    }),
  );
}
