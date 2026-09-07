import { Database } from "@calwise/database";
import { TRPCError } from "@trpc/server";
import { Effect } from "effect";
import { Worker } from "effect-cf";
import { createApp } from "./app.ts";

export default Worker.makeFetchHandler(Database.layer, {
  fetch: Effect.gen(function* () {
    const request = yield* Worker.NativeRequest;
    const context = yield* Effect.context<Database>();
    const runPromise = Effect.runPromiseWith(context);
    const app = createApp({
      greeting: () =>
        runPromise(
          Effect.gen(function* () {
            const db = yield* Database;
            const message = yield* db.greeting;
            return { message, database: "D1" as const };
          }).pipe(
            Effect.tapError((error) => Effect.logError(error)),
            Effect.mapError(
              () =>
                new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Database unavailable",
                }),
            ),
          ),
        ),
    });
    return yield* Effect.promise(() => Promise.resolve(app.fetch(request)));
  }),
});
