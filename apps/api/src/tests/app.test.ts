import { Effect, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";
import { app } from "../app.ts";
import { GreetingService } from "../modules/greeting/greeting-service.ts";

const runtime = ManagedRuntime.make(
  GreetingService.testLayer({ id: 1, message: "Hello from the test layer" }),
);
const env = {
  run: <A, E>(effect: Effect.Effect<A, E, GreetingService>) => runtime.runPromise(effect),
};

describe("api", () => {
  it("responds on /health", async () => {
    const res = await app.request("/health", undefined, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("returns the greeting through tRPC", async () => {
    const res = await app.request("/trpc/greeting.current", undefined, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      result: { data: { id: 1, message: "Hello from the test layer" } },
    });
  });

  it("allows the production origin", async () => {
    const res = await app.request(
      "/trpc/greeting.current",
      { headers: { Origin: "https://calwise.lastlab.win" } },
      env,
    );
    expect(res.headers.get("access-control-allow-origin")).toBe("https://calwise.lastlab.win");
  });

  it("rejects unknown origins", async () => {
    const res = await app.request(
      "/trpc/greeting.current",
      { headers: { Origin: "https://evil.example" } },
      env,
    );
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
