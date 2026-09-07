# Effect as the backend core, on a pinned RC train

The api is built on Effect 4 (services, layers) with the native Drizzle-on-Effect driver, so query builders are directly yieldable Effects with typed error channels. Both are prereleases whose APIs drift between builds (e.g. `Schema.TaggedErrorClass` → `Schema.TaggedError`), so `effect`, `@effect/sql-d1`, `effect-cf`, and `drizzle-orm` are pinned together in the pnpm catalog and only ever upgraded as a unit.

Originally the driver was `drizzle-orm/effect-postgres` over `@effect/sql-pg`; with the move to Cloudflare ([ADR 0006](./0006-cloudflare-as-the-platform-with-effect-cf.md)) it is `drizzle-orm/effect-d1` over `@effect/sql-d1`.
