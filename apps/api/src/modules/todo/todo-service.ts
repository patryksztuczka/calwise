import { Database, type NewTodo, type Todo, todos } from "@calwise/database";
import { desc } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Clock, Context, Effect, Layer } from "effect";

export class TodoService extends Context.Service<
  TodoService,
  {
    readonly list: Effect.Effect<Array<Todo>, EffectDrizzleQueryError>;
    readonly create: (input: NewTodo) => Effect.Effect<Todo, EffectDrizzleQueryError>;
  }
>()("@calwise/TodoService") {
  static readonly list = Effect.flatMap(TodoService, (service) => service.list);
  static readonly create = (input: NewTodo) =>
    Effect.flatMap(TodoService, (service) => service.create(input));

  static readonly layer = Layer.effect(
    TodoService,
    Effect.gen(function* () {
      const db = yield* Database;

      const list = db
        .select()
        .from(todos)
        .orderBy(desc(todos.createdAt))
        .pipe(Effect.withSpan("TodoService.list"));

      const create = Effect.fn("TodoService.create")(function* (input: NewTodo) {
        const rows = yield* db.insert(todos).values(input).returning();
        return rows[0]!;
      });

      return { list, create };
    }),
  );

  /** In-memory implementation for tests — no database required. */
  static readonly testLayer = Layer.sync(TodoService, () => {
    const store: Array<Todo> = [];
    let nextId = 1;
    return {
      list: Effect.sync(() => store.toReversed()),
      create: (input: NewTodo) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const todo: Todo = {
            id: nextId++,
            title: input.title,
            done: input.done ?? false,
            createdAt: new Date(now),
          };
          store.push(todo);
          return todo;
        }),
    };
  });
}
