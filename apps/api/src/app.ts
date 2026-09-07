import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { appRouter, type ApiContext } from "./trpc-router.ts";

export function createApp(context: ApiContext) {
  const app = new Hono();
  app.use(
    "/trpc/*",
    cors({ origin: "https://calwise.lastlab.win", allowMethods: ["GET", "OPTIONS"] }),
  );
  app.get("/health", (c) => c.json({ status: "ok" }));
  app.use(
    "/trpc/*",
    trpcServer({ router: appRouter, createContext: () => ({ greeting: context.greeting }) }),
  );
  return app;
}
