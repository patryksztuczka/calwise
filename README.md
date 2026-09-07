# Calwise

A public Hello World foundation on Cloudflare. React calls a Hono/tRPC Worker, which reads a seeded greeting from D1 through Drizzle and Effect.

## Local development

Use Node 26 and pnpm 11.17.0.

```sh
pnpm install
pnpm dev
```

Open http://localhost:5173. The Worker runs at http://localhost:8787. Startup applies local migrations before starting both apps. No Cloudflare credentials, Docker, or environment file is needed.

Local D1 data lives under `apps/api/.wrangler/`. Tests use a separate, freshly initialized `apps/api/.wrangler-test/` directory and never touch production.

## Checks

```sh
pnpm exec playwright install chromium
pnpm exec vp fmt --check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

The browser tests exercise the frontend, tRPC, the actual Workers runtime, and local D1. They also cover loading, network errors, database failures, API health, CORS, and rejection of writes. Tests reserve ports 4173, 8787, and 8788, so stop local development first.

`pnpm build` bundles the Worker without deploying and builds the static frontend. For a production frontend build, set `VITE_API_URL=https://calwise-api.lastlab.win`. GitHub Actions does this automatically. Local development uses Vite's `/trpc` proxy instead.

## Layout

- `apps/web`: React, Tailwind, TanStack Query, and the tRPC client.
- `apps/api`: Hono, tRPC, Effect 4, and the `effect-cf` Worker entry point.
- `packages/database`: D1 binding, Drizzle SQLite schema, migrations, and the Effect database service.
- `packages/shared`: shared Effect schemas.
- `packages/ui`: reusable React components.
- `infra`: Terraform resources and a separate state-bucket bootstrap.
- `.github/workflows`: checks, independent frontend/backend releases, and manual infrastructure operations.

## Database changes

```sh
pnpm db:generate
pnpm db:migrate:local
```

Edit `packages/database/src/schema.ts` before generating. Drizzle stores schema snapshots and SQL under `packages/database/drizzle/`. The generation command copies SQL into the flat `packages/database/migrations/` directory required by Wrangler. Commit both directories. Handwritten data migrations, such as the greeting seed, live directly in `migrations/` with timestamp-prefixed names.

Never edit an applied migration. Add a new migration instead. Backend deployment applies committed migrations automatically before uploading the Worker. Keep migrations compatible with the previous backend because database changes and application deployment are separate operations.

## Deployment

- Frontend: https://calwise.lastlab.win
- API health: https://calwise-api.lastlab.win/health
- Greeting: https://calwise-api.lastlab.win/trpc/greeting

See [deployment setup](docs/deployment.md) for the state bucket, credentials, manual Terraform workflow, and initial releases. Relevant changes on `master` deploy each application independently after checks pass. Infrastructure never applies automatically.

The foundation has no accounts, forms, product integrations, or public write endpoints.
