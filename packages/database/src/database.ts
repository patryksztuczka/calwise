import type { D1Client } from "@effect/sql-d1";
import type * as D1Drizzle from "drizzle-orm/effect-d1";
import { Context } from "effect";

export type DrizzleD1 = D1Drizzle.EffectSQLiteD1Database & {
  readonly $client: D1Client.D1Client;
};

/**
 * Drizzle over D1, as an Effect service whose query builders are yieldable Effects.
 * The live layer lives in `@calwise/database/d1` because it depends on the Cloudflare
 * runtime (`cloudflare:workers`); this module stays importable from Node for tests.
 */
export class Database extends Context.Service<Database, DrizzleD1>()("@calwise/Database") {}

export class FoodDatabase extends Context.Service<FoodDatabase, DrizzleD1>()(
  "@calwise/FoodDatabase",
) {}
