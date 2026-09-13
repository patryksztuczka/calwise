export interface PersonalProductConflictData {
  readonly kind: "DUPLICATE_BARCODE" | "IDEMPOTENCY_KEY_REUSED";
  readonly existingProductId: string;
}

export class PersonalProductConflictCause extends Error {
  readonly conflict: PersonalProductConflictData;

  constructor(conflict: PersonalProductConflictData) {
    super(conflict.kind);
    this.conflict = conflict;
  }
}
