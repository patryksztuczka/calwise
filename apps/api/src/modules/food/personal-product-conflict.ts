import { Schema } from "effect";

export class PersonalProductConflict extends Schema.TaggedError<PersonalProductConflict>()(
  "PersonalProductConflict",
  {
    conflict: Schema.Struct({
      kind: Schema.Literals(["DUPLICATE_BARCODE", "IDEMPOTENCY_KEY_REUSED"]),
      existingProductId: Schema.String,
    }),
  },
) {}
