import { validGoals } from "@calwise/food-rules/goals";
import { dateInZone, isLogDate } from "@calwise/food-rules/log";
import { Schema } from "effect";
import { protectedProcedure, router, runTrpc } from "../../http/trpc.ts";
import { ProfileService } from "./profile-service.ts";

const Goals = Schema.Struct({
  kcal: Schema.Finite,
  mode: Schema.Literals(["percentages", "grams"]),
  protein: Schema.Finite,
  carbs: Schema.Finite,
  fat: Schema.Finite,
}).check(Schema.makeFilter(validGoals));
const TimeZone = Schema.String.check(
  Schema.makeFilter((zone) => {
    try {
      return Boolean(new Intl.DateTimeFormat("en", { timeZone: zone }).resolvedOptions().timeZone);
    } catch {
      return false;
    }
  }),
);
export const profileRouter = router({
  goals: protectedProcedure
    .input(
      Schema.toStandardSchemaV1(
        Schema.Struct({
          date: Schema.String.check(Schema.makeFilter(isLogDate)),
        }),
      ),
    )
    .query(({ ctx, input }) =>
      runTrpc(
        ctx,
        ProfileService.use((service) => service.goals(ctx.session.user.id, input.date)),
      ),
    ),
  saveGoals: protectedProcedure
    .input(Schema.toStandardSchemaV1(Schema.Struct({ goals: Goals, timeZone: TimeZone })))
    .mutation(({ ctx, input }) =>
      runTrpc(
        ctx,
        ProfileService.use((service) =>
          service.saveGoals(ctx.session.user.id, dateInZone(input.timeZone), input.goals),
        ),
      ),
    ),
});
