# One Effect Schema as the universal validator

Domain input schemas use Effect Schema wrapped with `Schema.toStandardSchemaV1`. Standard Schema lets the same definition validate tRPC inputs and client forms without adding Zod or Valibot.

Keep schemas in the API module while only the server uses them. Food inputs live next to `searchExpression` so validation and tokenization can be reviewed together. The web currently consumes only the router type from `@calwise/api/trpc`. Extract a shared package when a client needs runtime validation, giving it a second consumer.
