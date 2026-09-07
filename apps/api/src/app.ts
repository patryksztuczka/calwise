import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { RunEffect } from "./http/trpc.ts";
import { appRouter } from "./trpc-router.ts";

export interface AppEnv {
  Bindings: { readonly run: RunEffect };
}

const productionOrigin = "https://calwise.lastlab.win";
const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** The HTTP surface. Platform-agnostic: the Worker entrypoint passes `run` as the Hono env. */
export const app = new Hono<AppEnv>();

app.use(
  "/trpc/*",
  cors({
    origin: (origin) =>
      origin === productionOrigin || localOrigin.test(origin) ? origin : undefined,
  }),
);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => ({ run: c.env.run }),
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal server error" }, 500);
});
