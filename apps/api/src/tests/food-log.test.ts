import type { Product } from "@calwise/database/food-schema";
import type { PersonalProduct } from "@calwise/food-rules/personal-product";
import { TRPCError } from "@trpc/server";
import { Effect, Layer, Schema } from "effect";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.ts";
import { FoodService } from "../modules/food/food-service.ts";
import { PersonalProductService } from "../modules/food/personal-product-service.ts";
import { FoodLogService, type Entry } from "../modules/food-log/food-log-service.ts";
import { testEnv } from "./test-env.ts";

const product: Product = {
  barcode: "0000000000001",
  name: "Cheese",
  brands: null,
  packageQuantity: null,
  servingSize: null,
  energyKcal100g: 350,
  energyKj100g: null,
  protein100g: 25,
  carbohydrates100g: 0,
  fat100g: 25,
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
  sourceUrl: "https://world.openfoodfacts.org/product/0000000000001",
  sourceModifiedAt: 0,
};
const personalProduct: PersonalProduct = {
  source: "personal",
  id: "c04c67ee-ce29-4442-aec3-b8f95b811c40",
  barcode: null,
  name: "Broth",
  brand: null,
  packageQuantity: "1 L",
  servingSize: null,
  nutritionBasis: "ml",
  energyKcal100: 12.5,
  energyKj100: 52.3,
  protein100: 1,
  carbohydrates100: 0,
  fat100: 0,
  saturatedFat100: 0,
  sugars100: null,
  fiber100: null,
  salt100: 0.8,
  sodium100: null,
  createdAt: 1,
};
const input = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  barcode: product.barcode,
  amount: 100,
  unit: "g",
  date: "2026-01-02",
  meal: "lunch",
} as const;
const personalInput = {
  id: "3a66a0aa-5d46-42af-84a4-c266f81c554b",
  productReference: { source: "personal", id: personalProduct.id },
  amount: 250,
  unit: "ml",
  date: "2026-01-02",
  meal: "lunch",
} as const;
const entry: Entry = {
  ...input,
  productSource: "catalog",
  personalProductId: null,
  nutritionBasis: null,
  name: product.name,
  brands: null,
  energyKcal100g: 350,
  energyKj100g: null,
  protein100g: 25,
  carbohydrates100g: 0,
  fat100g: 25,
  saturatedFat100g: null,
  sugars100g: null,
  fiber100g: null,
  salt100g: null,
  sodium100g: null,
  createdAt: 0,
};
const barcode = vi.fn(() => Effect.succeed<Product | undefined>(product));
const getPersonalProduct = vi.fn(() =>
  Effect.succeed<PersonalProduct | undefined>(personalProduct),
);
const get = vi.fn(() => Effect.succeed<Entry | undefined>(entry));
const add = vi.fn(() => Effect.succeed<Entry | undefined>(entry));
const update = vi.fn(() => Effect.succeed<Entry | undefined>(entry));
const remove = vi.fn(() => Effect.void);
const day = vi.fn(() => Effect.succeed([entry]));
const env = testEnv(
  Layer.mergeAll(
    Layer.succeed(FoodService, { barcode, search: () => Effect.succeed([]) }),
    Layer.succeed(PersonalProductService, {
      create: () => Effect.die("not used"),
      list: () => Effect.die("not used"),
      get: getPersonalProduct,
      barcode: () => Effect.die("not used"),
    }),
    Layer.succeed(FoodLogService, { day, get, add, update, remove }),
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
const mutate = (method: string, body: JsonValue, authenticated = true, run = env.run) =>
  app.request(
    `/trpc/foodLog.${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authenticated ? cookie : "" },
      body: JSON.stringify(body),
    },
    { ...env, run },
  );

beforeAll(async () => {
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" },
      body: JSON.stringify({
        name: "Logger",
        email: "logger@example.com",
        password: "correct horse battery",
      }),
    },
    env,
  );
  expect(response.status).toBe(200);
  cookie = response.headers.get("set-cookie")!.split(";")[0]!;
  const body = Schema.decodeUnknownSync(
    Schema.Struct({ user: Schema.Struct({ id: Schema.String }) }),
  )(await response.json());
  userId = body.user.id;
});
beforeEach(() => {
  vi.clearAllMocks();
});

describe("food log API", () => {
  it.each(["add", "update", "remove"])("requires a session for %s", async (method) => {
    expect((await mutate(method, input, false)).status).toBe(401);
    expect(add).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
  it("adds without a time zone and passes the authenticated owner", async () => {
    expect((await mutate("add", input)).status).toBe(200);
    const { id, barcode: _barcode, ...change } = input;
    expect(add).toHaveBeenCalledWith(
      userId,
      id,
      {
        productSource: "catalog",
        personalProductId: null,
        nutritionBasis: null,
        barcode: product.barcode,
        name: product.name,
        brands: product.brands,
        energyKcal100g: product.energyKcal100g,
        energyKj100g: product.energyKj100g,
        protein100g: product.protein100g,
        carbohydrates100g: product.carbohydrates100g,
        fat100g: product.fat100g,
        saturatedFat100g: product.saturatedFat100g,
        sugars100g: product.sugars100g,
        fiber100g: product.fiber100g,
        salt100g: product.salt100g,
        sodium100g: product.sodium100g,
      },
      change,
    );
  });
  it("accepts an explicit catalog reference without breaking legacy barcode input", async () => {
    const { barcode: catalogBarcode, ...rest } = input;
    expect(
      (
        await mutate("add", {
          ...rest,
          productReference: { source: "catalog", barcode: catalogBarcode },
        })
      ).status,
    ).toBe(200);
    expect(barcode).toHaveBeenCalledWith(catalogBarcode);
  });
  it("resolves an owned personal reference and captures its basis and nullable nutrition", async () => {
    expect((await mutate("add", personalInput)).status).toBe(200);
    expect(getPersonalProduct).toHaveBeenCalledWith(userId, personalProduct.id);
    expect(add).toHaveBeenCalledWith(
      userId,
      personalInput.id,
      {
        productSource: "personal",
        personalProductId: personalProduct.id,
        nutritionBasis: "ml",
        barcode: null,
        name: personalProduct.name,
        brands: null,
        energyKcal100g: 12.5,
        energyKj100g: 52.3,
        protein100g: 1,
        carbohydrates100g: 0,
        fat100g: 0,
        saturatedFat100g: 0,
        sugars100g: null,
        fiber100g: null,
        salt100g: 0.8,
        sodium100g: null,
      },
      { amount: 250, unit: "ml", date: "2026-01-02", meal: "lunch" },
    );
  });
  it("rejects incompatible personal units on add and update", async () => {
    expect((await mutate("add", { ...personalInput, unit: "g" })).status).toBe(400);
    expect(add).not.toHaveBeenCalled();

    get.mockReturnValueOnce(
      Effect.succeed({
        ...entry,
        productSource: "personal",
        personalProductId: personalProduct.id,
        nutritionBasis: "ml",
        unit: "ml",
      }),
    );
    expect((await mutate("update", { ...input, unit: "g" })).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
  it("does not reveal an unowned personal reference", async () => {
    getPersonalProduct.mockReturnValueOnce(Effect.succeed(undefined));
    expect((await mutate("add", personalInput)).status).toBe(404);
    expect(add).not.toHaveBeenCalled();
  });
  it("updates the snapshot without rereading the catalog", async () => {
    expect((await mutate("update", input)).status).toBe(200);
    const { id, barcode: _barcode, ...change } = input;
    expect(update).toHaveBeenCalledWith(userId, id, change);
    expect(barcode).not.toHaveBeenCalled();
  });
  it.each(["add", "update"])("rejects invalid portions and destinations on %s", async (method) => {
    await Promise.all(
      [
        { amount: 0 },
        { amount: -1 },
        { amount: "100" },
        { amount: Number.MAX_VALUE },
        { unit: "oz" },
        { date: "2026-02-30" },
        { date: "2999-01-01" },
        { meal: "brunch" },
      ].map(async (patch) => {
        expect((await mutate(method, { ...input, ...patch })).status).toBe(400);
      }),
    );
    expect(add).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
  it.each(["add", "update"])("uses UTC+14 today as the cutoff on %s", async (method) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-01-02T10:00:00Z"));
      expect((await mutate(method, { ...input, date: "2026-01-03" })).status).toBe(200);
      expect((await mutate(method, { ...input, date: "2026-01-04" })).status).toBe(400);
    } finally {
      vi.useRealTimers();
    }
  });
  it("returns NOT_FOUND for missing products without inserting", async () => {
    barcode.mockReturnValueOnce(Effect.succeed(undefined));
    expect((await mutate("add", input)).status).toBe(404);
    expect(add).not.toHaveBeenCalled();
  });
  it("fails when the inserted entry cannot be read back", async () => {
    add.mockReturnValueOnce(Effect.succeed(undefined));
    expect((await mutate("add", input)).status).toBe(500);
  });
  it("returns NOT_FOUND for missing entries before and during update", async () => {
    get.mockReturnValueOnce(Effect.succeed(undefined));
    expect((await mutate("update", input)).status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    update.mockReturnValueOnce(Effect.succeed(undefined));
    expect((await mutate("update", input)).status).toBe(404);
  });
  it("does not let runtime transport errors escape the shared error boundary", async () => {
    const response = await mutate("add", input, true, async () => {
      throw new TRPCError({ code: "NOT_FOUND", message: "private failure" });
    });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private failure");
  });
  it("removes only for the authenticated owner", async () => {
    expect((await mutate("remove", { id: input.id })).status).toBe(200);
    expect(remove).toHaveBeenCalledWith(userId, input.id);
  });
});
