import { initTRPC, TRPCError } from "@trpc/server";
import type { Effect } from "effect";
import type { AppServices } from "../layers.ts";
import type { Session } from "../modules/auth/auth-service.ts";

/** Runs an Effect against the Worker's runtime; supplied per request by the Worker entrypoint. */
export type RunEffect = <A, E>(effect: Effect.Effect<A, E, AppServices>) => Promise<A>;

export interface TrpcContext {
  readonly run: RunEffect;
  /** The signed-in user and their session, resolved from the request cookie; null for anonymous callers. */
  readonly session: Session | null;
}

export interface ConflictData {
  readonly kind: "DUPLICATE_BARCODE" | "IDEMPOTENCY_KEY_REUSED";
  readonly existingProductId: string;
}

class ConflictCause extends Error {
  readonly conflict: ConflictData;

  constructor(conflict: ConflictData) {
    super(conflict.kind);
    this.conflict = conflict;
  }
}

const t = initTRPC.context<TrpcContext>().create({
  errorFormatter(options) {
    const response = options.shape;
    return {
      ...response,
      data: {
        ...response.data,
        conflict:
          options.error.cause instanceof ConflictCause ? options.error.cause.conflict : null,
      },
    };
  },
});

export const conflictError = (conflict: ConflictData): TRPCError =>
  new TRPCError({
    code: "CONFLICT",
    message: conflict.kind,
    cause: new ConflictCause(conflict),
  });

export const router = t.router;
export const publicProcedure = t.procedure;

/** Rejects anonymous callers; resolvers see a non-null `ctx.session`. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.session === null) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { session: ctx.session } });
});

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
