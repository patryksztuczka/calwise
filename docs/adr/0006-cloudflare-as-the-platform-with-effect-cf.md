# Cloudflare as the platform, with effect-cf owning the Worker runtime

The web app is a static bundle on Cloudflare Pages, the api is a Worker, and the database is D1 — all on free tiers, all in one account, no servers to run. The Worker entrypoint is `Worker.make` from [effect-cf](https://github.com/danieljvdm/effect-cf): it builds the Effect runtime once per isolate, exposes bindings (the `DB` D1 database) as Effect services, and provides `WorkerEnvironment` to the application layer. Hono still owns routing and the tRPC adapter; the fetch Effect captures the runtime's services and hands Hono a `run` function so tRPC resolvers execute Effects against the same runtime.

effect-cf 0.40 declares `effect ^4.0.0-rc.112` as a peer, which our pinned `4.0.0-rc.112` satisfies; it also tests against workerd `1.20260825.1`, hence `compatibility_date: "2026-08-25"`.

## Consequences

- Nothing that imports `effect-cf` can load under Node, because it imports `cloudflare:workers`. `@calwise/database` therefore exports the `Database` tag from its root and the effect-cf-backed layer from `@calwise/database/d1`; `apps/api/src/app.ts` takes `run` through the Hono env so unit tests run the HTTP surface under Node with an in-memory layer.
- Local development needs no Cloudflare credentials: `wrangler dev` emulates the Worker and D1 on disk (`apps/api/.wrangler/`).
- Free-tier services only: no previews, no authentication, no public writes.
