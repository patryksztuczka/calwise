import { router } from "./http/trpc.ts";
import { todoRouter } from "./modules/todo/todo-trpc.ts";

export const appRouter = router({
  todo: todoRouter,
});

export type AppRouter = typeof appRouter;
