import { Database } from "@calwise/database";
import { Layer } from "effect";
import { TodoService } from "./modules/todo/todo-service.ts";

export const AppLayer = TodoService.layer.pipe(Layer.provideMerge(Database.layer));

export type AppServices = TodoService | Database;
