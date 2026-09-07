import * as D1Drizzle from "drizzle-orm/effect-d1";
import { Layer } from "effect";
import { D1 } from "effect-cf";
import { FoodDatabase } from "./index.ts";

const FoodBinding = D1.make("@calwise/FoodD1Binding", { binding: "FOOD_DB" });
export const FoodDatabaseLive = Layer.effect(FoodDatabase, D1Drizzle.makeWithDefaults({})).pipe(
  Layer.provide(FoodBinding.sqlLayer()),
);
