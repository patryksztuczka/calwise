# calwise

pnpm workspace monorepo built on the [Vite+](https://viteplus.dev) toolchain (`vp`), deployed to Cloudflare.

- Web: https://calwise.lastlab.win (Pages)
- API: https://calwise-api.lastlab.win (Worker)

## Stack

- **Toolchain**: Vite+ (`vp` — dev server, build, Vitest 4, Oxlint, Oxfmt, task runner with caching)
- **Package manager**: pnpm (workspace + catalog for version pinning)
- **Runtime**: Node 26 locally (native type stripping); Cloudflare Workers in production
- **TypeScript**: 7.x (native compiler)
- **`apps/web`**: React 19 + Tailwind CSS 4 + tRPC client + TanStack Query, hosted on Cloudflare Pages
- **`apps/api`**: Hono + tRPC v11 + Effect 4 via [effect-cf](https://github.com/danieljvdm/effect-cf), hosted on Cloudflare Workers
- **Auth**: [Better Auth](https://www.better-auth.com) email + password sessions, stored in D1 through its Drizzle adapter
- **Database**: Cloudflare D1 through Drizzle ORM's Effect driver (`drizzle-orm/effect-d1` over `@effect/sql-d1`)
- **Infrastructure**: Terraform (Cloudflare provider 5.x) with state in a private R2 bucket
- **CI/CD**: GitHub Actions

## Layout

```
apps/
  web/            # React + Tailwind, served by vp dev (port 5173, proxies /trpc and /api/auth → :8787)
  api/            # Hono + tRPC + Effect Worker (wrangler dev, port 8787); wrangler.jsonc binds D1
    src/worker.ts # entrypoint: effect-cf Worker.make(AppLayer) delegating requests to Hono
packages/
  database/       # @calwise/database — drizzle schema, generated migrations, Effect Database service
    migrations/   # drizzle-kit output, applied by wrangler d1 migrations
infra/            # Terraform: D1, Pages project + domain, DNS; bootstrap/ creates the R2 state bucket
.github/workflows # ci, infra (manual), checks/deploy-api/deploy-web (reusable)
docs/adr/         # architecture decision records
CONTEXT-MAP.md    # domain contexts and where each module's CONTEXT.md lives
vite.config.ts    # root Vite+ config; imports .oxfmtrc.json / .oxlintrc.json
.oxfmtrc.json     # formatting (single source of truth, also used by editors)
.oxlintrc.json    # linting (single source of truth, also used by editors)
```

## Getting started

No Cloudflare account or credentials are needed for local development; wrangler emulates the Worker and D1 on your machine.

```sh
pnpm install
pnpm db:migrate:local  # create + seed the local D1 (stored under apps/api/.wrangler/)
pnpm dev               # web (http://localhost:5173) + api (http://localhost:8787) in parallel
```

The app opens on the sign-in screen; create an account on the sign-up screen (email and password, no verification email) to reach Today. `/greeting` stays public and shows the message seeded by the first migration, with loading and error states. The api also answers `GET /health`, `GET /trpc/greeting.current`, and the Better Auth routes under `/api/auth/*`.

## Commands

| Command                 | What it does                                                              |
| ----------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`              | run all `dev` scripts in parallel (`vp run`)                              |
| `pnpm build`            | build all packages (cached by `vp run`)                                   |
| `pnpm test`             | run Vitest unit tests across the workspace (`vp test`)                    |
| `pnpm e2e`              | Playwright: browser → local Worker → local D1 (builds and serves both)    |
| `pnpm check`            | format-check + lint (`vp check`)                                          |
| `pnpm typecheck`        | `tsc` in every package (cached by `vp run`); regenerates Worker env types |
| `pnpm lint`             | Oxlint (`vp lint`)                                                        |
| `pnpm fmt`              | Oxfmt (`vp fmt`)                                                          |
| `pnpm db:migrate:local` | apply pending migrations to the emulated D1                               |

Inside `packages/database`: `pnpm db:generate` diffs `src/schema.ts` and writes a new migration folder; `pnpm db:generate --custom --name <x>` creates an empty one for hand-written SQL (such as seeds).

Inside `apps/api`: `pnpm db:migrate:remote` and `pnpm deploy` are what CD runs; they need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Deployment

Infrastructure must exist before the first application deployment. See [infra/README.md](./infra/README.md) for the one-time bootstrap (state bucket, API tokens, repository secrets) and the manual **Infrastructure** workflow.

After that, `CI` runs `checks.yml` once per pull request update or push to `master`: formatting, lint, typecheck, unit tests, builds, and the Playwright end-to-end test against emulated Cloudflare services. Pull requests never deploy. On pushes to `master`, both check jobs must pass before CI calls the applicable deployment workflows:

- **Deploy API** (`.github/workflows/deploy-api.yml`): changes under `apps/api` or `packages/database` trigger remote D1 migrations, a push of the `BETTER_AUTH_SECRET` repository secret to the Worker, then a Worker deploy. The custom domain `calwise-api.lastlab.win` is declared in `wrangler.jsonc` and created on the first deploy.
- **Deploy Web** (`.github/workflows/deploy-web.yml`): changes under `apps/web` or the api's router types trigger a build with `VITE_API_URL=https://calwise-api.lastlab.win`, then publish `dist` to the `calwise` Pages project.

Shared package configuration, the lockfile, root TypeScript configuration, and the CI/checks workflows trigger both deployments. Each deployment workflow also triggers its own deployment when changed. Path matching covers all commits in the push.

Neither deployment waits for the other, and neither reruns the checks. A push affecting both apps runs four jobs total: two check jobs and two deployment jobs. New pull request updates cancel outdated CI runs; master runs do not cancel in-progress migrations or deployments. A failed deployment is a normal failed GitHub Actions run; there is no automatic rollback.

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
- [infra/README.md](./infra/README.md) — what Terraform owns versus wrangler, and how to bootstrap

## Notes

- **Effect v4**: the api uses the v4 RC (`Context.Service` class keys, `Layer.effect`). `effect`, `@effect/sql-d1`, `effect-cf`, and `drizzle-orm` are pinned together in the pnpm catalog; prerelease APIs shift between builds, so upgrade them as a unit. effect-cf's manifest requires `effect ^4.0.0-rc.112`, which the current pin satisfies.
- **API architecture**: `@calwise/database` (drizzle schema + a `Database` Effect service; `@calwise/database/d1` provides it from the `DB` binding through effect-cf) → `modules/greeting/greeting-service.ts` (Effect service, with an in-memory `testLayer` next to it) → `trpc-router.ts` (tRPC v11 router, mounted on Hono at `/trpc` in `app.ts`) → `worker.ts` (effect-cf `Worker.make` owns the runtime and hands Hono a `run` function and the `auth` instance per request). `app.ts` never imports Cloudflare modules, so unit tests run it under Node with the test layer. The web app consumes the router type-only via `@calwise/api/trpc` (a devDependency).
- **Auth**: `modules/auth/auth-service.ts` builds the Better Auth instance (email + password, no verification, Drizzle adapter with plural table names); `auth-live.ts` provides it as the `AuthService` layer from the `DB` binding and the `BETTER_AUTH_SECRET` secret. Hono forwards `/api/auth/*` to it, and the tRPC context carries the caller's `session` so procedures can use `protectedProcedure`. Unit tests build the instance without a database, which keeps users in memory. The `dev` script passes a fixed development secret to `wrangler dev`; production reads the secret the Deploy API workflow pushes. The web app talks to it through `better-auth/react` (`src/lib/auth-client.ts`); `RequireAuth` guards the routes under the app shell.
- **Worker env types**: `apps/api/worker-configuration.d.ts` is generated by `wrangler types` (Env only; runtime types come from `@cloudflare/workers-types`). `pnpm typecheck` regenerates it; commit the result when `wrangler.jsonc` bindings change.
- **CORS**: the Worker allows `https://calwise.lastlab.win` and any `localhost` origin (for `vp preview` and Playwright), with credentials so the session cookie set by the api origin travels with `/trpc` and `/api/auth` calls. Local `vp dev` proxies both paths instead, so no CORS is involved.
- **Lint/format config**: `.oxfmtrc.json` and `.oxlintrc.json` are the single source of truth. `vp fmt`/`vp lint`/`vp check` only read config from `vite.config.ts`, so the root config imports both files and passes them through. Note oxfmt uses Prettier-style keys (`printWidth`, `tabWidth`).
- **Versions**: all shared dependency versions live in the `catalog:` section of `pnpm-workspace.yaml`. `vitest`, `oxfmt`, and `oxlint` are pinned to the versions bundled by `vite-plus` — keep them in sync when upgrading.
