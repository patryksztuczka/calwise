import { BARCODE_PATTERN } from "@calwise/food-rules";
import {
  dateInZone,
  entryNutrition,
  isLogDate,
  MEAL_SLOTS,
  type NutritionBasis,
} from "@calwise/food-rules/log";
import { TRPCError } from "@trpc/server";
import { Effect, Schema } from "effect";
import { protectedProcedure, router, runTrpc } from "../../http/trpc.ts";
import { FoodService } from "../food/food-service.ts";
import { FoodLogService } from "./food-log-service.ts";

const DateString = Schema.String.check(Schema.makeFilter(isLogDate));
const Id = Schema.String.check(Schema.isUUID());
const destination = {
  date: DateString,
  meal: Schema.Literals(MEAL_SLOTS),
  timeZone: Schema.String.check(Schema.isMaxLength(100)),
};
const amount = {
  amount: Schema.Number.check(Schema.isFinite(), Schema.isGreaterThan(0)),
  unit: Schema.Literals(["g", "ml"]),
};
const standard = Schema.toStandardSchemaV1;

function checkDate(date: string, timeZone: string) {
  let today: string;
  try {
    today = dateInZone(timeZone);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid time zone" });
  }
  if (date > today)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose today or a past date" });
}

function checkNutrition(basis: NutritionBasis, quantity: number) {
  if (!Object.values(entryNutrition(basis, quantity)).every(Number.isFinite)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Amount is too large" });
  }
}

export const foodLogRouter = router({
  day: protectedProcedure
    .input(standard(Schema.Struct({ date: DateString })))
    .query(({ ctx, input }) =>
      runTrpc(
        ctx,
        Effect.gen(function* () {
          return yield* (yield* FoodLogService).day(ctx.session.user.id, input.date);
        }),
      ),
    ),
  entry: protectedProcedure
    .input(standard(Schema.Struct({ id: Id })))
    .query(async ({ ctx, input }) => {
      const entry = await runTrpc(
        ctx,
        Effect.gen(function* () {
          return yield* (yield* FoodLogService).get(ctx.session.user.id, input.id);
        }),
      );
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      return entry;
    }),
  add: protectedProcedure
    .input(
      standard(
        Schema.Struct({
          id: Id,
          barcode: Schema.String.check(Schema.isPattern(BARCODE_PATTERN)),
          ...destination,
          ...amount,
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      checkDate(input.date, input.timeZone);
      const existing = await runTrpc(
        ctx,
        Effect.gen(function* () {
          return yield* (yield* FoodLogService).get(ctx.session.user.id, input.id);
        }),
      );
      if (existing) {
        if (
          existing.barcode !== input.barcode ||
          existing.amount !== input.amount ||
          existing.unit !== input.unit ||
          existing.meal !== input.meal ||
          existing.date !== input.date
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This addition was already saved. Refresh your meal before trying again.",
          });
        }
        return existing;
      }
      const product = await runTrpc(
        ctx,
        Effect.gen(function* () {
          return yield* (yield* FoodService).barcode(input.barcode);
        }),
      );
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      checkNutrition(product, input.amount);
      const entry = await runTrpc(
        ctx,
        Effect.gen(function* () {
          return yield* (yield* FoodLogService).add(ctx.session.user.id, input.id, product, {
            date: input.date,
            meal: input.meal,
            amount: input.amount,
            unit: input.unit,
          });
        }),
      );
      if (!entry) throw new TRPCError({ code: "CONFLICT" });
      return entry;
    }),
  update: protectedProcedure
    .input(standard(Schema.Struct({ id: Id, ...destination, ...amount })))
    .mutation(async ({ ctx, input }) => {
      checkDate(input.date, input.timeZone);
      const existing = await runTrpc(
        ctx,
        Effect.gen(function* () {
          return yield* (yield* FoodLogService).get(ctx.session.user.id, input.id);
        }),
      );
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      checkNutrition(existing, input.amount);
      const entry = await runTrpc(
        ctx,
        Effect.gen(function* () {
          return yield* (yield* FoodLogService).update(ctx.session.user.id, input.id, {
            date: input.date,
            meal: input.meal,
            amount: input.amount,
            unit: input.unit,
          });
        }),
      );
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      return entry;
    }),
  remove: protectedProcedure.input(standard(Schema.Struct({ id: Id }))).mutation(({ ctx, input }) =>
    runTrpc(
      ctx,
      Effect.gen(function* () {
        yield* (yield* FoodLogService).remove(ctx.session.user.id, input.id);
        return { removed: true };
      }),
    ),
  ),
});
