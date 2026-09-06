import { Schema } from "effect";

// Standard Schema (standardschema.dev) versions of domain inputs.
// Usable as tRPC procedure inputs AND react-hook-form resolvers.
export const CreateTodoInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    title: Schema.NonEmptyString,
  }),
);
export type CreateTodoInput = typeof CreateTodoInput.Type;
