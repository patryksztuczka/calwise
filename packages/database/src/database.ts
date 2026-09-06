import { PgClient } from "@effect/sql-pg";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { Config, Context, Layer, Redacted } from "effect";

export class Database extends Context.Service<
  Database,
  PgDrizzle.EffectPgDatabase & { readonly $client: PgClient.PgClient }
>()("@calwise/Database") {
  static readonly clientLayer = PgClient.layerConfig({
    url: Config.redacted("DATABASE_URL").pipe(
      Config.withDefault(Redacted.make("postgres://calwise:calwise@localhost:5434/calwise")),
    ),
  });

  static readonly layer = Layer.effect(Database, PgDrizzle.makeWithDefaults()).pipe(
    Layer.provide(Database.clientLayer),
  );
}
