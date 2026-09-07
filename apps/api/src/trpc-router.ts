import { router } from "./http/trpc.ts";
import { greetingRouter } from "./modules/greeting/greeting-trpc.ts";

export const appRouter = router({
  greeting: greetingRouter,
});

export type AppRouter = typeof appRouter;
