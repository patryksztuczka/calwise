import { Database, personalProducts, type PersonalProductRow } from "@calwise/database";
import {
  PERSONAL_PRODUCT_CURSOR_MAX_LENGTH,
  PERSONAL_PRODUCT_PAGE_SIZE,
  PERSONAL_PRODUCT_TEXT_MAX_LENGTH,
  type PersonalProduct,
  type PersonalProductCreateInput,
} from "@calwise/food-rules/personal-product";
import { and, asc, desc, eq, gt, like, lt, or, type SQL } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Context, Effect, Layer, Option, Schema } from "effect";
import type { PersonalProductConflictData } from "./personal-product-conflict.ts";

const Id = Schema.String.check(Schema.isUUID());

export const PersonalProductListSchema = Schema.Struct({
  query: Schema.optional(Schema.Trim.check(Schema.isMaxLength(PERSONAL_PRODUCT_TEXT_MAX_LENGTH))),
  cursor: Schema.optional(
    Schema.String.check(Schema.isMaxLength(PERSONAL_PRODUCT_CURSOR_MAX_LENGTH)),
  ),
});

export const PersonalProductGetSchema = Schema.Struct({ id: Id });

interface NormalizedCreate {
  readonly name: string;
  readonly brand: string | null;
  readonly barcode: string | null;
  readonly packageQuantity: string | null;
  readonly servingSize: string | null;
  readonly nutritionBasis: "g" | "ml";
  readonly energyKcal100: number;
  readonly energyKj100: number | null;
  readonly protein100: number;
  readonly carbohydrates100: number;
  readonly fat100: number;
  readonly saturatedFat100: number | null;
  readonly sugars100: number | null;
  readonly fiber100: number | null;
  readonly salt100: number | null;
  readonly sodium100: number | null;
}

export type CreateResult =
  | { readonly kind: "created"; readonly product: PersonalProduct }
  | { readonly kind: "replayed"; readonly product: PersonalProduct }
  | {
      readonly kind: "conflict";
      readonly conflict: PersonalProductConflictData;
    };

const BrowseCursorSchema = Schema.Struct({
  v: Schema.Literal(1),
  mode: Schema.Literal("browse"),
  createdAt: Schema.Number.check(Schema.isFinite()),
  id: Id,
});
const SearchCursorSchema = Schema.Struct({
  v: Schema.Literal(1),
  mode: Schema.Literal("search"),
  query: Schema.String,
  sortName: Schema.String,
  sortBrand: Schema.String,
  id: Id,
});
const PersonalProductCursorSchema = Schema.Union([BrowseCursorSchema, SearchCursorSchema]);
export type PersonalProductCursor = typeof PersonalProductCursorSchema.Type;

const nullableText = (value: string | undefined): string | null =>
  value === undefined || value === "" ? null : value;
const nullableNumber = (value: number | undefined): number | null => value ?? null;

const normalizeCreate = (input: PersonalProductCreateInput): NormalizedCreate => ({
  name: input.name,
  brand: nullableText(input.brand),
  barcode: nullableText(input.barcode),
  packageQuantity: nullableText(input.packageQuantity),
  servingSize: nullableText(input.servingSize),
  nutritionBasis: input.nutritionBasis,
  energyKcal100: input.energyKcal100,
  energyKj100: nullableNumber(input.energyKj100),
  protein100: input.protein100,
  carbohydrates100: input.carbohydrates100,
  fat100: input.fat100,
  saturatedFat100: nullableNumber(input.saturatedFat100),
  sugars100: nullableNumber(input.sugars100),
  fiber100: nullableNumber(input.fiber100),
  salt100: nullableNumber(input.salt100),
  sodium100: nullableNumber(input.sodium100),
});

/** SQLite has no portable unaccent collation, so writes store the folded search form. */
export const foldPersonalProductText = (value: string): string =>
  value
    .replace(/[łŁ]/g, "l")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

const toProduct = (row: PersonalProductRow): PersonalProduct => ({
  source: "personal",
  id: row.id,
  barcode: row.barcode,
  name: row.name,
  brand: row.brand,
  packageQuantity: row.packageQuantity,
  servingSize: row.servingSize,
  nutritionBasis: row.nutritionBasis,
  energyKcal100: row.energyKcal100,
  energyKj100: row.energyKj100,
  protein100: row.protein100,
  carbohydrates100: row.carbohydrates100,
  fat100: row.fat100,
  saturatedFat100: row.saturatedFat100,
  sugars100: row.sugars100,
  fiber100: row.fiber100,
  salt100: row.salt100,
  sodium100: row.sodium100,
  createdAt: row.createdAt,
});

const encodeCursor = (cursor: PersonalProductCursor): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
};

export const decodePersonalProductCursor = (value: string): PersonalProductCursor | null => {
  try {
    const padded = value
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return Option.getOrNull(Schema.decodeUnknownOption(PersonalProductCursorSchema)(parsed));
  } catch {
    return null;
  }
};

export class PersonalProductService extends Context.Service<
  PersonalProductService,
  {
    readonly create: (
      userId: string,
      input: PersonalProductCreateInput,
    ) => Effect.Effect<CreateResult, EffectDrizzleQueryError>;
    readonly list: (
      userId: string,
      query: string | undefined,
      cursor: PersonalProductCursor | undefined,
    ) => Effect.Effect<
      { readonly products: readonly PersonalProduct[]; readonly nextCursor: string | null },
      EffectDrizzleQueryError
    >;
    readonly get: (
      userId: string,
      id: string,
    ) => Effect.Effect<PersonalProduct | undefined, EffectDrizzleQueryError>;
    readonly barcode: (
      userId: string,
      barcode: string,
    ) => Effect.Effect<PersonalProduct | undefined, EffectDrizzleQueryError>;
  }
>()("@calwise/PersonalProductService") {
  static readonly layer = Layer.effect(
    PersonalProductService,
    Effect.gen(function* () {
      const db = yield* Database;

      const getRow = Effect.fn("PersonalProductService.getRow")(function* (
        userId: string,
        id: string,
      ) {
        const rows = yield* db
          .select()
          .from(personalProducts)
          .where(and(eq(personalProducts.userId, userId), eq(personalProducts.id, id)))
          .limit(1);
        return rows[0];
      });

      const create = Effect.fn("PersonalProductService.create")(function* (
        userId: string,
        input: PersonalProductCreateInput,
      ) {
        const values = normalizeCreate(input);
        const requestFingerprint = JSON.stringify(values);
        const sortName = foldPersonalProductText(values.name);
        const sortBrand = foldPersonalProductText(values.brand ?? "");
        const inserted = yield* db
          .insert(personalProducts)
          .values({
            id: crypto.randomUUID(),
            userId,
            requestId: input.requestId,
            requestFingerprint,
            ...values,
            searchText: ` ${[sortName, sortBrand].filter(Boolean).join(" ")} `,
            sortName,
            sortBrand,
            createdAt: Date.now(),
          })
          .onConflictDoNothing()
          .returning();
        if (inserted[0]) return { kind: "created", product: toProduct(inserted[0]) } as const;

        const requestRows = yield* db
          .select()
          .from(personalProducts)
          .where(
            and(
              eq(personalProducts.userId, userId),
              eq(personalProducts.requestId, input.requestId),
            ),
          )
          .limit(1);
        const replay = requestRows[0];
        if (replay) {
          return replay.requestFingerprint === requestFingerprint
            ? ({ kind: "replayed", product: toProduct(replay) } as const)
            : ({
                kind: "conflict",
                conflict: { kind: "IDEMPOTENCY_KEY_REUSED", existingProductId: replay.id },
              } as const);
        }

        if (values.barcode !== null) {
          const barcodeRows = yield* db
            .select({ id: personalProducts.id })
            .from(personalProducts)
            .where(
              and(
                eq(personalProducts.userId, userId),
                eq(personalProducts.barcode, values.barcode),
              ),
            )
            .limit(1);
          if (barcodeRows[0])
            return {
              kind: "conflict",
              conflict: { kind: "DUPLICATE_BARCODE", existingProductId: barcodeRows[0].id },
            } as const;
        }

        return yield* Effect.die("personal product insert conflicted without an owning row");
      });

      const list = Effect.fn("PersonalProductService.list")(function* (
        userId: string,
        query: string | undefined,
        cursor: PersonalProductCursor | undefined,
      ) {
        const normalizedQuery = foldPersonalProductText(query ?? "");
        const tokens = normalizedQuery.split(" ").filter(Boolean);
        const searching = tokens.length > 0;
        const conditions: SQL[] = [eq(personalProducts.userId, userId)];

        if (searching) {
          for (const token of tokens)
            conditions.push(like(personalProducts.searchText, `% ${token}%`));
          if (cursor?.mode === "search") {
            conditions.push(
              or(
                gt(personalProducts.sortName, cursor.sortName),
                and(
                  eq(personalProducts.sortName, cursor.sortName),
                  or(
                    gt(personalProducts.sortBrand, cursor.sortBrand),
                    and(
                      eq(personalProducts.sortBrand, cursor.sortBrand),
                      gt(personalProducts.id, cursor.id),
                    ),
                  ),
                ),
              )!,
            );
          }
        } else if (cursor?.mode === "browse") {
          conditions.push(
            or(
              lt(personalProducts.createdAt, cursor.createdAt),
              and(
                eq(personalProducts.createdAt, cursor.createdAt),
                lt(personalProducts.id, cursor.id),
              ),
            )!,
          );
        }

        const rows = searching
          ? yield* db
              .select()
              .from(personalProducts)
              .where(and(...conditions))
              .orderBy(
                asc(personalProducts.sortName),
                asc(personalProducts.sortBrand),
                asc(personalProducts.id),
              )
              .limit(PERSONAL_PRODUCT_PAGE_SIZE + 1)
          : yield* db
              .select()
              .from(personalProducts)
              .where(and(...conditions))
              .orderBy(desc(personalProducts.createdAt), desc(personalProducts.id))
              .limit(PERSONAL_PRODUCT_PAGE_SIZE + 1);
        const page = rows.slice(0, PERSONAL_PRODUCT_PAGE_SIZE);
        const last = page.at(-1);
        const nextCursor =
          rows.length > PERSONAL_PRODUCT_PAGE_SIZE && last
            ? encodeCursor(
                searching
                  ? {
                      v: 1,
                      mode: "search",
                      query: normalizedQuery,
                      sortName: last.sortName,
                      sortBrand: last.sortBrand,
                      id: last.id,
                    }
                  : { v: 1, mode: "browse", createdAt: last.createdAt, id: last.id },
              )
            : null;
        return { products: page.map(toProduct), nextCursor };
      });

      const get = Effect.fn("PersonalProductService.get")(function* (userId: string, id: string) {
        const row = yield* getRow(userId, id);
        return row ? toProduct(row) : undefined;
      });

      const barcode = Effect.fn("PersonalProductService.barcode")(function* (
        userId: string,
        code: string,
      ) {
        const rows = yield* db
          .select()
          .from(personalProducts)
          .where(and(eq(personalProducts.userId, userId), eq(personalProducts.barcode, code)))
          .limit(1);
        return rows[0] ? toProduct(rows[0]) : undefined;
      });

      return { create, list, get, barcode };
    }),
  );
}
