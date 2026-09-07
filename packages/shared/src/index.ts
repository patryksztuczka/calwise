import { Schema } from "effect";

export const Greeting = Schema.Struct({
  message: Schema.String,
  database: Schema.Literal("D1"),
});
export type Greeting = typeof Greeting.Type;
