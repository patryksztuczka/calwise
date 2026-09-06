import { afterAll, describe, expect, it } from "@effect/vitest";
import type { Todo } from "@calwise/database";
import { Effect } from "effect";
import { app } from "../../../app.ts";
import { runtime } from "../../../runtime.ts";

afterAll(() => runtime.dispose());

const json = <A>(res: Response) => Effect.promise(() => res.json() as Promise<A>);

const trpcQuery = (path: string) =>
  Effect.promise(() => Promise.resolve(app.request(`/trpc/${path}`)));

const trpcMutation = (path: string, body: string) =>
  Effect.promise(() =>
    Promise.resolve(
      app.request(`/trpc/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    ),
  );

describe("todo trpc router", () => {
  it.effect("creates a todo", () =>
    Effect.gen(function* () {
      const res = yield* trpcMutation("todo.create", JSON.stringify({ title: "via trpc" }));
      expect(res.status).toBe(200);

      const todo = (yield* json<{ result: { data: Todo } }>(res)).result.data;
      expect(todo.id).toBeGreaterThan(0);
      expect(todo.title).toBe("via trpc");
      expect(todo.done).toBe(false);
    }),
  );

  it.effect("lists todos, newest first", () =>
    Effect.gen(function* () {
      expect((yield* trpcMutation("todo.create", JSON.stringify({ title: "older" }))).status).toBe(
        200,
      );
      expect((yield* trpcMutation("todo.create", JSON.stringify({ title: "newer" }))).status).toBe(
        200,
      );

      const res = yield* trpcQuery("todo.list");
      expect(res.status).toBe(200);

      const titles = (yield* json<{ result: { data: Array<Todo> } }>(res)).result.data.map(
        (todo) => todo.title,
      );
      expect(titles).toContain("older");
      expect(titles).toContain("newer");
      expect(titles.indexOf("newer")).toBeLessThan(titles.indexOf("older"));
    }),
  );

  it.effect("rejects empty titles via schema validation", () =>
    Effect.gen(function* () {
      const res = yield* trpcMutation("todo.create", JSON.stringify({ title: "" }));
      expect(res.status).toBe(400);
    }),
  );

  it.effect("rejects missing titles", () =>
    Effect.gen(function* () {
      const res = yield* trpcMutation("todo.create", JSON.stringify({}));
      expect(res.status).toBe(400);
    }),
  );

  it.effect("rejects malformed json bodies", () =>
    Effect.gen(function* () {
      const res = yield* trpcMutation("todo.create", "not json");
      expect(res.status).toBe(400);
    }),
  );
});
