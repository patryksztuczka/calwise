# Context Map

## Contexts

- [Todo](./apps/api/src/modules/todo/CONTEXT.md): capturing and listing the things a user intends to get done

## Relationships

- **Todo → web**: `apps/web/src/modules/todo` is a client of the Todo context. It consumes the api's tRPC router type-only (`import type { AppRouter } from "@calwise/api/trpc"`) and holds no domain rules of its own.
- **Todo ↔ shared**: the context's input schemas live in `@calwise/shared/todo` and are used verbatim on both sides — as tRPC procedure inputs in the api and as form resolvers in the web app.
