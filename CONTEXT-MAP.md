# Context Map

## Contexts

- [Greeting](./apps/api/src/modules/greeting/CONTEXT.md): the seeded message that proves the browser → Worker → D1 path works
- [Auth](./apps/api/src/modules/auth/CONTEXT.md): who the caller is: accounts, sign-up, sign-in and sessions

## Relationships

- **Greeting → web**: `apps/web/src/app.tsx` is a client of the Greeting context. It consumes the api's tRPC router type-only (`import type { AppRouter } from "@calwise/api/trpc"`) and holds no domain rules of its own.
- **Greeting → database**: the context reads the `greetings` table defined in `@calwise/database/schema`; the row shape is the Drizzle-inferred `Greeting` type.
- **Auth → web**: the sign-in and sign-up screens and the `RequireAuth` route guard in `apps/web` are clients of the Auth context through the Better Auth client; the web app holds no auth rules of its own.
- **Auth → database**: the context owns the `users`, `sessions`, `accounts` and `verifications` tables in `@calwise/database/schema`; their shape follows Better Auth's Drizzle adapter.
- **Auth → tRPC**: every tRPC call carries the caller's session in its context; other contexts read it through `protectedProcedure` and never touch the auth tables.
