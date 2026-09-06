# tRPC with a type-only export from the api

The web app talks to the api through tRPC v11 (mounted on Hono at `/trpc`). For end-to-end types, `@calwise/api` exports its router as `"./trpc"` and the web app declares `@calwise/api` as a devDependency, importing only `type { AppRouter }` — server code never reaches the client bundle. We chose this over a separate api-contract package because the router _is_ the contract; a duplicate would only drift.
