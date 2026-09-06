import { serve } from "@hono/node-server";
import { Config } from "effect";
import { app } from "./app.ts";
import { runtime } from "./runtime.ts";

const port = await runtime.runPromise(Config.port("PORT").pipe(Config.withDefault(3000)));
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.info(`api listening on http://localhost:${info.port}`);
});

const shutdown = () => {
  server.close();
  void runtime.dispose().finally(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
