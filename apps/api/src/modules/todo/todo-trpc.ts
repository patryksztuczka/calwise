import { CreateTodoInput } from "@calwise/shared/todo";
import { publicProcedure, router, runTrpc } from "../../http/trpc.ts";
import { TodoService } from "./todo-service.ts";

export const todoRouter = router({
  list: publicProcedure.query(() => runTrpc(TodoService.list)),
  create: publicProcedure
    .input(CreateTodoInput)
    .mutation(({ input }) => runTrpc(TodoService.create({ title: input.title }))),
});
