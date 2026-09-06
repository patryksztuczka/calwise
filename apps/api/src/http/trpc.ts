import { initTRPC, TRPCError } from "@trpc/server";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Effect, Schema } from "effect";
import type { AppServices } from "../layers.ts";
import { runtime } from "../runtime.ts";

/** Domain-level "bad request" error resolvers can yield; mapped to BAD_REQUEST. */
export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()("InvalidRequest", {
  message: Schema.String,
}) {}

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Runs an Effect inside a tRPC resolver through the app runtime,
 * mapping the typed error channel to TRPCErrors.
 */
export const runTrpc = async <A>(
  effect: Effect.Effect<A, EffectDrizzleQueryError | InvalidRequest, AppServices>,
): Promise<A> => {
  const result = await runtime.runPromise(
    effect.pipe(
      Effect.map((value) => ({ ok: true as const, value })),
      Effect.catchTags({
        InvalidRequest: (error) =>
          Effect.succeed({
            ok: false as const,
            error: new TRPCError({ code: "BAD_REQUEST", message: error.message }),
          }),
      }),
    ),
  );
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
};
