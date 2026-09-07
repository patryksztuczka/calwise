import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { isAllowedOrigin } from "./http/origins.ts";
import type { RunEffect } from "./http/trpc.ts";
import type { Auth } from "./modules/auth/auth-service.ts";
import { appRouter } from "./trpc-router.ts";

export interface AppEnv {
  Bindings: { readonly run: RunEffect; readonly auth: Auth };
}

/** The HTTP surface. Platform-agnostic: the Worker entrypoint passes `run` and `auth` as the Hono env. */
export const app = new Hono<AppEnv>();

// Session cookies travel with both the auth routes and tRPC, so both need credentialed CORS.
const credentialedCors = cors({
  origin: (origin) => (isAllowedOrigin(origin) ? origin : undefined),
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
});
app.use("/api/auth/*", credentialedCors);
app.use("/trpc/*", credentialedCors);

app.on(["GET", "POST"], "/api/auth/*", (c) => c.env.auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async (_opts, c) => ({
      run: c.env.run,
      session: await c.env.auth.api.getSession({ headers: c.req.raw.headers }),
    }),
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal server error" }, 500);
});
