import { router } from "./http/trpc.ts";
import { foodRouter } from "./modules/food/food-trpc.ts";
import { greetingRouter } from "./modules/greeting/greeting-trpc.ts";

export const appRouter = router({
  greeting: greetingRouter,
  food: foodRouter,
});

export type AppRouter = typeof appRouter;
