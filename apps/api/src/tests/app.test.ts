import { describe, expect, it } from "vitest";
import { app } from "../app.ts";

describe("api", () => {
  it("responds on /health", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("says hello", async () => {
    const res = await app.request("/api/hello");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "hello from hono + effect + drizzle",
    });
  });
});
