# Effect as the backend core, on a pinned RC train

The api is built on Effect 4 (services, layers, `ManagedRuntime`) with the native Drizzle-on-Effect driver (`drizzle-orm/effect-postgres` over `@effect/sql-pg`), so query builders are directly yieldable Effects with typed error channels. Both are prereleases whose APIs drift between builds (e.g. `Schema.TaggedErrorClass` → `Schema.TaggedError`), so `effect`, `@effect/sql-pg`, and `drizzle-orm` are pinned together in the pnpm catalog and only ever upgraded as a unit.
