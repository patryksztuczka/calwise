import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { TodoService } from "../todo-service.ts";

describe("TodoService", () => {
  it.effect("creates and lists todos, newest first", () =>
    Effect.gen(function* () {
      const service = yield* TodoService;
      yield* service.create({ title: "first" });
      const second = yield* service.create({ title: "second" });

      const list = yield* service.list;
      expect(list).toHaveLength(2);
      expect(list[0]).toEqual(second);
    }).pipe(Effect.provide(TodoService.testLayer)),
  );

  it.effect("stamps createdAt from the clock", () =>
    Effect.gen(function* () {
      const service = yield* TodoService;
      yield* TestClock.adjust("5 seconds");

      const todo = yield* service.create({ title: "clocked" });
      expect(todo.createdAt.getTime()).toBe(5000);
      expect(todo.done).toBe(false);
    }).pipe(Effect.provide(TodoService.testLayer)),
  );
});
