import { drizzle } from "drizzle-orm/d1";
import { Context, Effect, Layer, Schema } from "effect";
import { D1 } from "effect-cf";
import { eq } from "drizzle-orm";
import { greetings } from "./schema.ts";

class D1Binding extends D1.Service<D1Binding>()("@calwise/D1", { binding: "DB" }) {}

export class DatabaseError extends Schema.TaggedError<DatabaseError>()("DatabaseError", {
  cause: Schema.Defect(),
}) {}

export class Database extends Context.Service<
  Database,
  { readonly greeting: Effect.Effect<string, DatabaseError> }
>()("@calwise/Database") {
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const binding = yield* D1Binding;
      const db = drizzle(binding);
      const greeting = Effect.gen(function* () {
        const row = yield* Effect.tryPromise({
          try: () => db.select().from(greetings).where(eq(greetings.id, 1)).get(),
          catch: (cause) => new DatabaseError({ cause }),
        });
        if (!row) {
          return yield* new DatabaseError({ cause: "Greeting seed is missing. Apply migrations." });
        }
        return row.message;
      }).pipe(Effect.withSpan("Database.greeting"));
      return { greeting };
    }),
  ).pipe(Layer.provide(D1Binding.layer));
}
