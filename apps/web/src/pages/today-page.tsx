import { Plus, UserRound } from "lucide-react";
import { Link } from "react-router";
import { IconButton } from "../components/icon-button";
import { PrimaryAction } from "../components/primary-action";
import { DailyEnergyCounter } from "../modules/today/daily-energy-counter";
import { DailyMacroCounters } from "../modules/today/daily-macro-counters";
import { MealRow } from "../modules/today/meal-row";
import { mockDailyLog } from "../modules/today/today-data";

/** "Calwise · Today": the daily overview with the energy counter, macro counters and logged meals. */
export default function TodayPage() {
  const log = mockDailyLog;
  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex h-11 items-center justify-between">
        <h1 className="font-display text-32 leading-none font-extrabold tracking-[-0.8px] text-lime italic">
          CALWISE
        </h1>
        <IconButton aria-label="Profile" disabled title="Profile is not available yet">
          <UserRound size={21} aria-hidden="true" />
        </IconButton>
      </header>

      <div className="mt-[6px]">
        <DailyEnergyCounter
          date={log.date}
          caloriesEaten={log.caloriesEaten}
          calorieGoal={log.calorieGoal}
        />
      </div>

      <DailyMacroCounters macros={log.macros} />

      <section aria-labelledby="meals-heading" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2
            id="meals-heading"
            className="font-body text-11 font-bold tracking-[1.1px] text-white"
          >
            YOUR MEALS
          </h2>
          <p className="font-body text-11 text-muted">{log.meals.length} logged</p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {log.meals.map((meal) => (
            <li key={meal.id}>
              <MealRow meal={meal} />
            </li>
          ))}
        </ul>
      </section>

      <PrimaryAction render={<Link to="/log-food" />}>
        <Plus size={23} strokeWidth={2.5} aria-hidden="true" />
        LOG FOOD
      </PrimaryAction>
    </div>
  );
}
