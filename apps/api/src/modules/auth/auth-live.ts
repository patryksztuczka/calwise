import { Config, Effect, Layer } from "effect";
import { WorkerEnvironment } from "effect-cf";
import { AuthService } from "./auth-service.ts";

/** Built once per Worker isolate from the `DB` binding and the `BETTER_AUTH_SECRET` secret. */
export const AuthLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    const env = yield* WorkerEnvironment;
    const secret = yield* Config.string("BETTER_AUTH_SECRET");
    return AuthService.make({ secret, database: env.DB });
  }),
);
