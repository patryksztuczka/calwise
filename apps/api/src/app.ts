import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { appRouter } from "./trpc-router.ts";

export const app = new Hono();

const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
});
app.use("/api/*", corsMiddleware);
app.use("/trpc/*", corsMiddleware);

app.use("/trpc/*", trpcServer({ router: appRouter }));

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/api/hello", (c) => c.json({ message: "hello from hono + effect + drizzle" }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal server error" }, 500);
});
