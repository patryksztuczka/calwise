import { BARCODE_PATTERN } from "@calwise/food-rules";
import {
  dateInZone,
  isLogDate,
  isLoggableDate,
  isValidPortion,
  LOGGED_UNITS,
  MEAL_SLOTS,
} from "@calwise/food-rules/log";
import { TRPCError } from "@trpc/server";
import { Effect, Schema } from "effect";
import { protectedProcedure, router, runTrpc } from "../../http/trpc.ts";
import { FoodService } from "../food/food-service.ts";
import { FoodLogService } from "./food-log-service.ts";

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
  add: protectedProcedure
    .input(
      standard(
        Schema.Struct({
          id: Id,
          barcode: Schema.String.check(Schema.isPattern(BARCODE_PATTERN)),
          ...entryChange,
        }),
      ),
    )
    .mutation(async ({ ctx, input: { id, barcode, ...change } }) => {
      const product = await runTrpc(
        ctx,
        FoodService.use((service) => service.barcode(barcode)),
      );
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
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
