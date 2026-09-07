import * as D1Drizzle from "drizzle-orm/effect-d1";
import { type Context, Layer } from "effect";
import { D1 } from "effect-cf";
import { Database, FoodDatabase, type DrizzleD1 } from "./database.ts";

const layerFromD1Binding = <Id>(tag: Context.Service<Id, DrizzleD1>, binding: string) => {
  const d1 = D1.make(`${tag.key}/D1Binding`, { binding });
  return Layer.effect(tag, D1Drizzle.makeWithDefaults({})).pipe(Layer.provide(d1.sqlLayer()));
};

/** Require effect-cf's WorkerEnvironment, supplied by Worker.make. */
export const DatabaseLive = layerFromD1Binding(Database, "DB");
export const FoodDatabaseLive = layerFromD1Binding(FoodDatabase, "FOOD_DB");
