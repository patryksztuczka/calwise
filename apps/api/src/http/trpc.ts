import { initTRPC, TRPCError } from "@trpc/server";
import type { Effect } from "effect";
import type { AppServices } from "../layers.ts";

/** Runs an Effect against the Worker's runtime; supplied per request by the Worker entrypoint. */
export type RunEffect = <A, E>(effect: Effect.Effect<A, E, AppServices>) => Promise<A>;

export interface TrpcContext {
  readonly run: RunEffect;
}

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Maps a failed Effect to a tRPC error so callers see a proper error envelope. */
export const runTrpc = async <A, E>(
  ctx: TrpcContext,
  effect: Effect.Effect<A, E, AppServices>,
): Promise<A> => {
  try {
    return await ctx.run(effect);
  } catch (cause) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "internal server error", cause });
  }
};
