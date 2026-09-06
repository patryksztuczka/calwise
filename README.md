# calwise

pnpm workspace monorepo built on the [Vite+](https://viteplus.dev) toolchain (`vp`).

## Stack

- **Toolchain**: Vite+ (`vp` — dev server, build, Vitest 4, Oxlint, Oxfmt, task runner with caching)
- **Package manager**: pnpm (workspace + catalog for version pinning)
- **Runtime**: Node 26 (runs TypeScript directly via native type stripping — no build step for the API)
- **TypeScript**: 7.x (native compiler)
- **`apps/web`**: React 19 + Tailwind CSS 4 + tRPC client + TanStack Query + react-hook-form
- **`apps/api`**: Hono + tRPC v11 + Effect 4 + Drizzle ORM + node-postgres
- **Database**: PostgreSQL 18 via Docker Compose

## Layout

```
apps/
  web/            # React + Tailwind, served by vp dev (port 5173, proxies /api and /trpc → :3000)
  api/            # Hono + tRPC + Effect (port 3000)
packages/
  database/       # @calwise/database — drizzle schema, migrations, Effect Database service
  shared/         # @calwise/shared — domain input schemas (Effect Schema via Standard Schema)
  ui/             # @calwise/ui — shared React components (raw .tsx source)
docs/adr/         # architecture decision records
CONTEXT-MAP.md    # domain contexts and where each module's CONTEXT.md lives
vite.config.ts    # root Vite+ config; imports .oxfmtrc.json / .oxlintrc.json
.oxfmtrc.json     # formatting (single source of truth, also used by editors)
.oxlintrc.json    # linting (single source of truth, also used by editors)
docker-compose.yml
```

## Getting started

```sh
cp .env.example .env   # database url, ports
pnpm install
pnpm db:up             # start postgres (docker)
pnpm db:migrate        # apply drizzle migrations
pnpm dev               # start web + api in parallel
```

Open http://localhost:5173 — the page shows live API status and a todo list backed by the api via tRPC.

## Commands

| Command            | What it does                                      |
| ------------------ | ------------------------------------------------- |
| `pnpm dev`         | run all `dev` scripts in parallel (`vp run`)      |
| `pnpm build`       | build all packages (cached by `vp run`)           |
| `pnpm test`        | run Vitest across the workspace (`vp test`)       |
| `pnpm check`       | format-check + lint (`vp check`)                  |
| `pnpm typecheck`   | `tsc` in every package (cached by `vp run`)       |
| `pnpm lint`        | Oxlint (`vp lint`)                                |
| `pnpm fmt`         | Oxfmt (`vp fmt`)                                  |
| `pnpm db:up`       | start postgres container                          |
| `pnpm db:generate` | generate a SQL migration from schema changes      |
| `pnpm db:migrate`  | apply migrations to the database                  |
| `pnpm db:push`     | push schema directly (prototyping, no migrations) |
| `pnpm db:studio`   | open Drizzle Studio                               |

## Effect typechecking

`pnpm typecheck` runs `tsc` in every package. The root `prepare` script runs
`effect-tsgo patch --typescript` after installs, replacing the local compiler with
Effect's compatible build. This enables Effect diagnostics configured in
`tsconfig.base.json`. Keep TypeScript's version compatible with `@effect/tsgo`.

For VS Code, install the TypeScript 7 extension and configure the workspace SDK
path as `./node_modules/typescript/bin`. Select that SDK and restart the
TypeScript server.

## Documentation

- [CONTEXT-MAP.md](./CONTEXT-MAP.md) — the domain contexts and where each one's `CONTEXT.md` (glossary of domain language) lives
- [docs/adr/](./docs/adr) — architecture decision records; read these before changing anything that looks unusual, it may be deliberate

## Notes

- **Ports**: postgres binds to host port `5434` by default (configurable via `POSTGRES_PORT` in `.env`) to avoid clashing with other local postgres instances. The container listens on `5432` internally.
- **Effect v4**: the API uses the v4 RC (`Context.Service` class keys, `Layer.effect`, `ManagedRuntime`). Drizzle is pinned to a 1.0 RC build compiled against the same effect RC — prerelease APIs shift between builds (e.g. `Schema.TaggedErrorClass` → `Schema.TaggedError`), so keep `effect`, `@effect/sql-pg`, and `drizzle-orm` moving together.
- **API architecture**: `@calwise/database` (drizzle schema + the native `drizzle-orm/effect-postgres` driver on `@effect/sql-pg`, exposed as an Effect `Database` service whose query builders are yieldable Effects) → `modules/todo/todo-service.ts` (Effect service, with an in-memory `testLayer` next to it) → `trpc-router.ts` (tRPC v11 router, mounted on Hono at `/trpc` in `app.ts`) → `index.ts` (server entry + graceful shutdown). The web app consumes the router type-only via `@calwise/api/trpc` (a devDependency) and validates forms with the same `@calwise/shared` schemas the procedures use. The api imports package TypeScript source directly — Node resolves the pnpm symlinks and strips types natively.
- **Lint/format config**: `.oxfmtrc.json` and `.oxlintrc.json` are the single source of truth. `vp fmt`/`vp lint`/`vp check` only read config from `vite.config.ts`, so the root config imports both files and passes them through. Note oxfmt uses Prettier-style keys (`printWidth`, `tabWidth`).
- **Versions**: all shared dependency versions live in the `catalog:` section of `pnpm-workspace.yaml`. `vitest`, `oxfmt`, and `oxlint` are pinned to the versions bundled by `vite-plus` — keep them in sync when upgrading.
