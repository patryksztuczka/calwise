import { describe, expect, it } from "vitest";
import { app } from "../app.ts";
import { GreetingService } from "../modules/greeting/greeting-service.ts";
import { testEnv } from "./test-env.ts";

const env = testEnv(GreetingService.testLayer({ id: 1, message: "Hello from the test layer" }));

interface Credentials {
  readonly email: string;
  readonly password: string;
  readonly name?: string;
}

const json = (path: string, body: Credentials, headers: Record<string, string> = {}) =>
  app.request(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5173", ...headers },
      body: JSON.stringify(body),
    },
    env,
  );

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

  it("returns 404 when no greeting exists", async () => {
    const res = await app.request(
      "/trpc/greeting.current",
      undefined,
      testEnv(GreetingService.testLayer(undefined)),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      error: { message: "greeting not found", data: { code: "NOT_FOUND" } },
    });
  });

  it("allows the production origin", async () => {
    const res = await app.request(
      "/trpc/greeting.current",
      { headers: { Origin: "https://calwise.lastlab.win" } },
      env,
    );
    expect(res.headers.get("access-control-allow-origin")).toBe("https://calwise.lastlab.win");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
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

describe("auth", () => {
  const credentials = { email: "ada@example.com", password: "correct horse battery" };

  it("signs up without verification and signs in with the same credentials", async () => {
    const signUp = await json("/api/auth/sign-up/email", { ...credentials, name: "ada" });
    expect(signUp.status).toBe(200);
    expect(signUp.headers.get("set-cookie")).toContain("better-auth.session_token=");

    const signIn = await json("/api/auth/sign-in/email", credentials);
    expect(signIn.status).toBe(200);
    const cookie = signIn.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("better-auth.session_token=");

    const session = await app.request(
      "/api/auth/get-session",
      { headers: { Cookie: cookie.split(";")[0] ?? "" } },
      env,
    );
    expect(session.status).toBe(200);
    expect(await session.json()).toMatchObject({ user: { email: credentials.email } });
  });

  it("rejects a wrong password", async () => {
    const res = await json("/api/auth/sign-in/email", { ...credentials, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects an unknown account", async () => {
    const res = await json("/api/auth/sign-in/email", {
      email: "nobody@example.com",
      password: "whatever12",
    });
    expect(res.status).toBe(401);
  });
});
