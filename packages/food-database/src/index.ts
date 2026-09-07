import type { D1Client } from "@effect/sql-d1";
import type * as D1Drizzle from "drizzle-orm/effect-d1";
import { Context } from "effect";

export class FoodDatabase extends Context.Service<
  FoodDatabase,
  D1Drizzle.EffectSQLiteD1Database & { readonly $client: D1Client.D1Client }
>()("@calwise/FoodDatabase") {}

export { products, type Product } from "./schema.ts";
