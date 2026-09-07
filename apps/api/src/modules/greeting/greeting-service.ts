import { Database, type Greeting, greetings } from "@calwise/database";
import { asc } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Context, Effect, Layer, Schema } from "effect";

export class GreetingNotFound extends Schema.TaggedError<GreetingNotFound>()(
  "GreetingNotFound",
  {},
) {}

export class GreetingService extends Context.Service<
  GreetingService,
  {
    /** The seeded greeting: the first row of `greetings`. */
    readonly current: Effect.Effect<Greeting, GreetingNotFound | EffectDrizzleQueryError>;
  }
>()("@calwise/GreetingService") {
  static readonly current = Effect.flatMap(GreetingService, (service) => service.current);

  static readonly layer = Layer.effect(
    GreetingService,
    Effect.gen(function* () {
      const db = yield* Database;

      const current = db
        .select()
        .from(greetings)
        .orderBy(asc(greetings.id))
        .limit(1)
        .pipe(
          Effect.flatMap((rows) =>
            rows[0] === undefined ? Effect.fail(new GreetingNotFound()) : Effect.succeed(rows[0]),
          ),
          Effect.withSpan("GreetingService.current"),
        );

      return { current };
    }),
  );

  /** In-memory implementation for tests — no D1 required. */
  static readonly testLayer = (greeting: Greeting) =>
    Layer.succeed(GreetingService, { current: Effect.succeed(greeting) });
}
