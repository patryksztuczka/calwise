import type { Product } from "@calwise/database/food-schema";
import type { PersonalProduct } from "@calwise/food-rules/personal-product";
import { Effect, Layer, Schema } from "effect";
import type { inferRouterError } from "@trpc/server";
import { beforeAll, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { PersonalProductConflict } from "../modules/food/personal-product-conflict.ts";
import type { AppRouter } from "../trpc-router.ts";
import { app } from "../app.ts";
import { FoodService } from "../modules/food/food-service.ts";
import {
  type CreateResult,
  foldPersonalProductText,
  PersonalProductService,
} from "../modules/food/personal-product-service.ts";
import { testEnv } from "./test-env.ts";

const sharedBarcode = "00001234";
const personalProduct: PersonalProduct = {
  source: "personal",
  id: "d8f9962c-b7d1-4c37-b689-c53c2a04d61d",
  barcode: sharedBarcode,
  name: "Żółty ser",
  brand: "Łąka",
  packageQuantity: null,
  servingSize: "1 slice",
  nutritionBasis: "g",
  energyKcal100: 350.125,
  energyKj100: null,
  protein100: 25,
  carbohydrates100: 0,
  fat100: 25,
  saturatedFat100: null,
  sugars100: null,
  fiber100: null,
  salt100: null,
  sodium100: null,
  createdAt: 1,
};
const catalogProduct: Product = {
  barcode: sharedBarcode,
  name: "Catalog cheese",
  brands: null,
  packageQuantity: null,
  servingSize: null,
  energyKcal100g: 300,
  energyKj100g: null,
  protein100g: 20,
  carbohydrates100g: 1,
  fat100g: 20,
  saturatedFat100g: null,
  sugars100g: null,
  fiber100g: null,
  salt100g: null,
  sodium100g: null,
  countries: [],
  categories: [],
  allergens: [],
  traces: [],
  dataQualityErrors: [],
  imageUrl: null,
  thumbnailUrl: null,
  sourceUrl: "https://world.openfoodfacts.org/product/00001234",
  sourceModifiedAt: 0,
};
const createInput = {
  requestId: "3f4ccbdd-8c27-4fae-b39c-abb59e5338ca",
  name: "  Żółty ser  ",
  brand: "Łąka",
  barcode: "00001234",
  servingSize: "1 slice",
  nutritionBasis: "g",
  energyKcal100: 350.125,
  protein100: 25,
  carbohydrates100: 0,
  fat100: 25,
} as const;

const create = vi.fn((): Effect.Effect<CreateResult, PersonalProductConflict> =>
  Effect.succeed({ kind: "created", product: personalProduct }),
);
const list = vi.fn(() =>
  Effect.succeed<{
    readonly products: readonly PersonalProduct[];
    readonly nextCursor: string | null;
  }>({ products: [personalProduct], nextCursor: null }),
);
const get = vi.fn(() => Effect.succeed<PersonalProduct | undefined>(personalProduct));
const personalBarcode = vi.fn(() => Effect.succeed<PersonalProduct | undefined>(personalProduct));
const catalogBarcode = vi.fn(() => Effect.succeed<Product | undefined>(catalogProduct));
const env = testEnv(
  Layer.mergeAll(
    Layer.succeed(PersonalProductService, { create, list, get, barcode: personalBarcode }),
    Layer.succeed(FoodService, {
      search: () => Effect.succeed([]),
      barcode: catalogBarcode,
    }),
  ),
);
let cookie: string;
let userId: string;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };

const query = (path: string, input: JsonValue, authenticated = true) =>
  app.request(
    `/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`,
    { headers: { Cookie: authenticated ? cookie : "" } },
    env,
  );
const mutate = (path: string, input: JsonValue, authenticated = true) =>
  app.request(
    `/trpc/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authenticated ? cookie : "",
      },
      body: JSON.stringify(input),
    },
    env,
  );

beforeAll(async () => {
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" },
      body: JSON.stringify({
        name: "Creator",
        email: "creator@example.com",
        password: "correct horse battery",
      }),
    },
    env,
  );
  expect(response.status).toBe(200);
  cookie = response.headers.get("set-cookie")!.split(";")[0]!;
  const signedUp = Schema.decodeUnknownSync(
    Schema.Struct({ user: Schema.Struct({ id: Schema.String }) }),
  )(await response.json());
  userId = signedUp.user.id;
});

beforeEach(() => {
  vi.clearAllMocks();
  create.mockReturnValue(Effect.succeed({ kind: "created", product: personalProduct }));
  get.mockReturnValue(Effect.succeed(personalProduct));
  personalBarcode.mockReturnValue(Effect.succeed(personalProduct));
});

describe("personal product API", () => {
  it("infers the Food conflict payload in router errors", () => {
    expectTypeOf<inferRouterError<AppRouter>["data"]["conflict"]>().toEqualTypeOf<
      PersonalProductConflict["conflict"] | null
    >();
  });

  it("does not attach a conflict to unrelated errors", async () => {
    const response = await mutate("food.personalCreate", createInput, false);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { data: { code: "UNAUTHORIZED", conflict: null } },
    });
  });
  it.each(["food.personalCreate", "food.personalList", "food.personalGet"])(
    "requires authentication for %s",
    async (path) => {
      const response = path.endsWith("Create")
        ? await mutate(path, createInput, false)
        : await query(path, path.endsWith("Get") ? { id: personalProduct.id } : {}, false);
      expect(response.status).toBe(401);
    },
  );

  it("validates, trims, and returns the creation result", async () => {
    const response = await mutate("food.personalCreate", createInput);
    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(userId, { ...createInput, name: "Żółty ser" });
    expect(await response.json()).toMatchObject({
      result: { data: { product: personalProduct, created: true } },
    });
  });

  it("accepts blank optional strings, including barcode", async () => {
    const response = await mutate("food.personalCreate", {
      ...createInput,
      brand: "   ",
      barcode: "   ",
      packageQuantity: "",
      servingSize: " ",
    });
    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(userId, {
      ...createInput,
      brand: "",
      barcode: "",
      packageQuantity: "",
      servingSize: "",
      name: "Żółty ser",
    });
  });

  it("returns the original product for an idempotent replay", async () => {
    create.mockReturnValueOnce(Effect.succeed({ kind: "replayed", product: personalProduct }));
    const response = await mutate("food.personalCreate", createInput);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      result: { data: { product: personalProduct, created: false } },
    });
  });

  it("folds accents and Polish ł into the persisted search form", () => {
    expect(foldPersonalProductText("  ŻÓŁTY, crème  ")).toBe("zolty creme");
  });

  it.each([
    { name: "   " },
    { name: "x".repeat(201) },
    { barcode: "123" },
    { energyKcal100: -1 },
    { energyKcal100: Number.POSITIVE_INFINITY },
  ])("rejects invalid creation input %#", async (patch) => {
    expect((await mutate("food.personalCreate", { ...createInput, ...patch })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a missing required nutrient", async () => {
    const { protein100: _protein100, ...withoutProtein } = createInput;
    expect((await mutate("food.personalCreate", withoutProtein)).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it.each(["DUPLICATE_BARCODE", "IDEMPOTENCY_KEY_REUSED"] as const)(
    "returns typed %s conflicts",
    async (kind) => {
      create.mockReturnValueOnce(
        Effect.fail(
          new PersonalProductConflict({
            conflict: { kind, existingProductId: personalProduct.id },
          }),
        ),
      );
      const response = await mutate("food.personalCreate", createInput);
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: expect.objectContaining({
          message: kind,
          data: expect.objectContaining({
            code: "CONFLICT",
            httpStatus: 409,
            conflict: { kind, existingProductId: personalProduct.id },
          }),
        }),
      });
    },
  );

  it("keeps unexpected creation failures as internal errors without conflict data", async () => {
    create.mockReturnValueOnce(Effect.die(new Error("unexpected failure")));
    const response = await mutate("food.personalCreate", createInput);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: {
        message: "internal server error",
        data: { code: "INTERNAL_SERVER_ERROR", conflict: null },
      },
    });
  });

  it("lists and retrieves only through owner-scoped service calls", async () => {
    expect((await query("food.personalList", { query: "  zol laka  " })).status).toBe(200);
    expect(list).toHaveBeenCalledWith(userId, "zol laka", undefined);
    expect((await query("food.personalGet", { id: personalProduct.id })).status).toBe(200);
    expect(get).toHaveBeenCalledWith(userId, personalProduct.id);

    get.mockReturnValueOnce(Effect.succeed(undefined));
    expect((await query("food.personalGet", { id: personalProduct.id })).status).toBe(404);
  });

  it("rejects malformed and query-mismatched cursors", async () => {
    expect((await query("food.personalList", { cursor: "not-a-cursor" })).status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });

  it("prefers the signed-in owner's personal barcode match", async () => {
    const response = await query("food.barcode", { barcode: personalProduct.barcode });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      result: { data: { source: "personal", product: personalProduct, attribution: null } },
    });
    expect(personalBarcode).toHaveBeenCalledWith(userId, personalProduct.barcode);
    expect(catalogBarcode).not.toHaveBeenCalled();
  });
});
