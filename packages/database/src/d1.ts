import * as D1Drizzle from "drizzle-orm/effect-d1";
import { Layer } from "effect";
import { D1 } from "effect-cf";
import { Database } from "./database.ts";

/** The `DB` D1 binding declared in apps/api/wrangler.jsonc, read from the Worker env. */
export const D1Binding = D1.make("@calwise/D1Binding", { binding: "DB" });

/** Requires effect-cf's `WorkerEnvironment`, which `Worker.make` provides. */
export const DatabaseLive = Layer.effect(Database, D1Drizzle.makeWithDefaults({})).pipe(
  Layer.provide(D1Binding.sqlLayer()),
);
