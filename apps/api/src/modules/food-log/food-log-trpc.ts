import type { Product } from "@calwise/database/food-schema";
import { BARCODE_PATTERN } from "@calwise/food-rules";
import {
  dateInZone,
  isLogDate,
  isLoggableDate,
  isValidPortion,
  LOGGED_UNITS,
  MEAL_SLOTS,
} from "@calwise/food-rules/log";
import type { PersonalProduct } from "@calwise/food-rules/personal-product";
import { TRPCError } from "@trpc/server";
import { Effect, Schema } from "effect";
import { protectedProcedure, router, runTrpc } from "../../http/trpc.ts";
import { FoodService } from "../food/food-service.ts";
import { PersonalProductService } from "../food/personal-product-service.ts";
import { type CapturedProduct, FoodLogService } from "./food-log-service.ts";

const DateString = Schema.String.check(Schema.makeFilter(isLogDate));
/** Today or earlier, judged in the first time zone to reach a new date. */
const LoggableDate = DateString.check(
  Schema.makeFilter((date) => isLoggableDate(date, dateInZone("Pacific/Kiritimati")), {
    title: "Choose today or a past date",
  }),
);
const Id = Schema.String.check(Schema.isUUID());
const entryChange = {
  date: LoggableDate,
  meal: Schema.Literals(MEAL_SLOTS),
  amount: Schema.Number.check(Schema.isFinite(), Schema.isGreaterThan(0)),
  unit: Schema.Literals(LOGGED_UNITS),
};
const standard = Schema.toStandardSchemaV1;
const Barcode = Schema.String.check(Schema.isPattern(BARCODE_PATTERN));
const ProductReference = Schema.Union([
  Schema.Struct({ source: Schema.Literal("catalog"), barcode: Barcode }),
  Schema.Struct({ source: Schema.Literal("personal"), id: Id }),
]);
const AddInput = Schema.Union([
  Schema.Struct({ id: Id, barcode: Barcode, ...entryChange }),
  Schema.Struct({ id: Id, productReference: ProductReference, ...entryChange }),
]);

type SnapshotProduct = Omit<
  CapturedProduct,
  "productSource" | "personalProductId" | "nutritionBasis"
>;

const captureProduct = (
  {
    barcode,
    name,
    brands,
    energyKcal100g,
    energyKj100g,
    protein100g,
    carbohydrates100g,
    fat100g,
    saturatedFat100g,
    sugars100g,
    fiber100g,
    salt100g,
    sodium100g,
  }: SnapshotProduct,
  reference: Pick<CapturedProduct, "productSource" | "personalProductId" | "nutritionBasis">,
): CapturedProduct => ({
  ...reference,
  barcode,
  name,
  brands,
  energyKcal100g,
  energyKj100g,
  protein100g,
  carbohydrates100g,
  fat100g,
  saturatedFat100g,
  sugars100g,
  fiber100g,
  salt100g,
  sodium100g,
});

const captureCatalogProduct = (product: Product): CapturedProduct =>
  captureProduct(product, {
    productSource: "catalog",
    personalProductId: null,
    nutritionBasis: null,
  });

const capturePersonalProduct = (product: PersonalProduct): CapturedProduct =>
  captureProduct(
    {
      barcode: product.barcode,
      name: product.name,
      brands: product.brand,
      energyKcal100g: product.energyKcal100,
      energyKj100g: product.energyKj100,
      protein100g: product.protein100,
      carbohydrates100g: product.carbohydrates100,
      fat100g: product.fat100,
      saturatedFat100g: product.saturatedFat100,
      sugars100g: product.sugars100,
      fiber100g: product.fiber100,
      salt100g: product.salt100,
      sodium100g: product.sodium100,
    },
    {
      productSource: "personal",
      personalProductId: product.id,
      nutritionBasis: product.nutritionBasis,
    },
  );

export const foodLogRouter = router({
  day: protectedProcedure
    .input(standard(Schema.Struct({ date: DateString })))
    .query(({ ctx, input }) =>
      runTrpc(
        ctx,
        FoodLogService.use((service) => service.day(ctx.session.user.id, input.date)),
      ),
    ),
  entry: protectedProcedure
    .input(standard(Schema.Struct({ id: Id })))
    .query(async ({ ctx, input }) => {
      const entry = await runTrpc(
        ctx,
        FoodLogService.use((service) => service.get(ctx.session.user.id, input.id)),
      );
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      return entry;
    }),
  add: protectedProcedure.input(standard(AddInput)).mutation(async ({ ctx, input }) => {
    const { id, amount, unit, date, meal } = input;
    const reference =
      "barcode" in input
        ? ({ source: "catalog", barcode: input.barcode } as const)
        : input.productReference;
    let product: CapturedProduct;
    if (reference.source === "catalog") {
      const catalogProduct = await runTrpc(
        ctx,
        FoodService.use((service) => service.barcode(reference.barcode)),
      );
      if (!catalogProduct) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      product = captureCatalogProduct(catalogProduct);
    } else {
      const personalProduct = await runTrpc(
        ctx,
        PersonalProductService.use((service) => service.get(ctx.session.user.id, reference.id)),
      );
      if (!personalProduct)
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      product = capturePersonalProduct(personalProduct);
      if (unit !== product.nutritionBasis)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unit must match the personal product nutrition basis",
        });
    }
    const change = { amount, unit, date, meal };
    if (!isValidPortion(product, change.amount))
      throw new TRPCError({ code: "BAD_REQUEST", message: "Amount is too large" });
    const entry = await runTrpc(
      ctx,
      FoodLogService.use((service) => service.add(ctx.session.user.id, id, product, change)),
    );
    // The insert skips duplicate ids and the read-back returns the existing row,
    // so no entry here means the row vanished or belongs to someone else.
    if (!entry) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return entry;
  }),
  update: protectedProcedure
    .input(standard(Schema.Struct({ id: Id, ...entryChange })))
    .mutation(async ({ ctx, input: { id, ...change } }) => {
      const existing = await runTrpc(
        ctx,
        FoodLogService.use((service) => service.get(ctx.session.user.id, id)),
      );
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.productSource === "personal" && change.unit !== existing.nutritionBasis)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unit must match the captured personal product nutrition basis",
        });
      if (!isValidPortion(existing, change.amount))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Amount is too large" });
      const entry = await runTrpc(
        ctx,
        FoodLogService.use((service) => service.update(ctx.session.user.id, id, change)),
      );
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      return entry;
    }),
  remove: protectedProcedure
    .input(standard(Schema.Struct({ id: Id })))
    .mutation(({ ctx, input }) =>
      runTrpc(
        ctx,
        FoodLogService.use((service) => service.remove(ctx.session.user.id, input.id)).pipe(
          Effect.as({ removed: true }),
        ),
      ),
    ),
});
