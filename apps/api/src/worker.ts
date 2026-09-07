import { Effect } from "effect";
import { Worker } from "effect-cf";
import { app } from "./app.ts";
import type { RunEffect } from "./http/trpc.ts";
import { AppLayer, type AppServices } from "./layers.ts";

// effect-cf owns the Effect runtime and the Cloudflare bindings; Hono owns routing.
// Each request captures the runtime's services so tRPC resolvers can run Effects.
export default Worker.make(
  AppLayer,
  Effect.gen(function* () {
    const request = yield* Worker.NativeRequest;
    const services = yield* Effect.context<AppServices>();
    const run: RunEffect = Effect.runPromiseWith(services);
    return yield* Effect.promise(() => Promise.resolve(app.fetch(request, { run })));
  }),
);
