# One Effect Schema as the universal validator

Domain input schemas are Effect Schema wrapped with `Schema.toStandardSchemaV1`, and the exact same object serves as the tRPC procedure input on the server and the form resolver on the client. We deliberately do not add Zod or Valibot: Effect Schema is already in the stack, and Standard Schema makes one definition validate both sides.

The foundation currently has no procedure that takes input, so the `@calwise/shared` package that held these schemas was removed with the prototypes. Recreate it (rather than defining inputs inside the api) when the first input schema arrives.
