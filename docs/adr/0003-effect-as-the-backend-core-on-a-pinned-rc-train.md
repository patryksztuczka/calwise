# Effect as the backend core on a pinned RC train

The backend uses Effect 4 services and layers, with `effect-cf` providing Worker execution and typed Cloudflare bindings. Pin Effect and its SQL packages to `4.0.0-rc.112`, which satisfies `effect-cf@0.40.0`, because prerelease APIs change between releases.

D1 queries use Drizzle's D1 driver, wrapped at the database boundary in `Effect.tryPromise` with a typed error. PostgreSQL and its native Effect driver are removed. The installed Effect release uses `Context.Service` and `Schema.TaggedError`; follow its source rather than examples written for another RC.
