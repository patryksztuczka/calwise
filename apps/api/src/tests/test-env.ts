import { type Effect, type Layer, ManagedRuntime } from "effect";
import { afterAll } from "vitest";
import { AuthService } from "../modules/auth/auth-service.ts";

export const testEnv = <R>(layer: Layer.Layer<R>) => {
  const runtime = ManagedRuntime.make(layer);
  afterAll(() => runtime.dispose());
  return {
    run: <A, E>(effect: Effect.Effect<A, E, R>) => runtime.runPromise(effect),
    // No database: Better Auth keeps users in memory for this test environment.
    auth: AuthService.make({ secret: "test-secret-that-is-long-enough-for-better-auth" }),
  };
};
