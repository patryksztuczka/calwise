# One Effect Schema as the universal validator

Domain input schemas live in `@calwise/shared` as Effect Schema wrapped with `Schema.toStandardSchemaV1`, and the exact same object serves as the tRPC procedure input on the server and the react-hook-form resolver on the client. We deliberately did not add Zod or Valibot: Effect Schema is already in the stack, and Standard Schema makes one definition validate both sides.
