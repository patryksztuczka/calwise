import { Plus } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_GOALS, goalTargets } from "@calwise/food-rules/goals";
import { useTRPC } from "../lib/trpc";
import { DateNavigation } from "../modules/food-log/date-navigation";
import { LogQueryState } from "../modules/food-log/log-query-state";
import { daySummary } from "../modules/food-log/day-summary";
import { mealUrl, useLogDestination } from "../modules/food-log/destination";
import { PrimaryAction } from "../components/primary-action";
import { DailyEnergyCounter } from "../modules/today/daily-energy-counter";
import { DailyMacroCounters } from "../modules/today/daily-macro-counters";
import { MealRow } from "../modules/today/meal-row";

/** "Calwise · Today": the daily overview with the energy counter, macro counters and logged meals. */
export default function TodayPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const { date, setDate } = useLogDestination();
  const query = useQuery(trpc.foodLog.day.queryOptions({ date }));
  const goalsQuery = useQuery(trpc.profile.goals.queryOptions({ date }));
  const targets = goalTargets(goalsQuery.data ?? DEFAULT_GOALS);
  const log = daySummary(query.data ?? []);
  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex h-11 items-center justify-between">
        <h1 className="font-display text-32 leading-none font-extrabold tracking-[-0.8px] text-lime italic">
          CALWISE
        </h1>
      </header>

      <DateNavigation date={date} onChange={setDate} />
      {query.isPending || query.isError || goalsQuery.isPending || goalsQuery.isError ? (
        <LogQueryState
          failed={query.isError || goalsQuery.isError}
          retry={() => {
            void query.refetch();
            void goalsQuery.refetch();
          }}
        />
      ) : (
        <>
          <div className="mt-[6px]">
            <DailyEnergyCounter caloriesEaten={log.totals.kcal} calorieGoal={targets.kcal} />
          </div>

          <DailyMacroCounters totals={log.totals} targets={targets} />

          <section aria-labelledby="meals-heading" className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h2
                id="meals-heading"
                className="font-body text-11 font-bold tracking-[1.1px] text-white"
              >
                YOUR MEALS
              </h2>
            </div>
            <ul className="flex flex-col gap-2.5">
              {log.meals.map((meal) => (
                <li key={meal.meal}>
                  <MealRow
                    {...meal}
                    onOpen={() => {
                      void navigate(mealUrl({ date, meal: meal.meal }));
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <PrimaryAction render={<Link to={`/log-food?date=${date}`} />}>
        <Plus size={23} strokeWidth={2.5} aria-hidden="true" />
        LOG FOOD
      </PrimaryAction>
    </div>
  );
}
