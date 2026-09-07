# Context Map

## Contexts

- [Greeting](./apps/api/src/modules/greeting/CONTEXT.md): the seeded message that proves the browser → Worker → D1 path works

## Relationships

- **Greeting → web**: `apps/web/src/app.tsx` is a client of the Greeting context. It consumes the api's tRPC router type-only (`import type { AppRouter } from "@calwise/api/trpc"`) and holds no domain rules of its own.
- **Greeting → database**: the context reads the `greetings` table defined in `@calwise/database/schema`; the row shape is the Drizzle-inferred `Greeting` type.
