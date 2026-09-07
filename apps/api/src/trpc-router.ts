import { foodRouter } from "./modules/food/food-trpc.ts";
import { router } from "./http/trpc.ts";
import { todoRouter } from "./modules/todo/todo-trpc.ts";

export const appRouter = router({
  todo: todoRouter,
  food: foodRouter,
});

export type AppRouter = typeof appRouter;
