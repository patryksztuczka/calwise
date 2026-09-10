import { parseLocalDate } from "@calwise/food-rules/log";
import { Check, ChevronDown } from "lucide-react";
import { numberFormat as number } from "../../lib/number-format";
import { CalorieGauge } from "./calorie-gauge";
import { summarizeCalories } from "./daily-summary";
import { useRevealProgress } from "./use-reveal-progress";

function dayLabel(date: string): string {
  return parseLocalDate(date)
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}

interface DailyEnergyCounterProps {
  readonly date: string;
  readonly caloriesEaten: number;
  readonly calorieGoal: number;
}

/** Eaten calories, remaining budget in a segmented gauge and the goal caption ("Component / Daily energy counter"). */
export function DailyEnergyCounter({ date, caloriesEaten, calorieGoal }: DailyEnergyCounterProps) {
  const reveal = useRevealProgress();
  const final = summarizeCalories(caloriesEaten, calorieGoal);
  const animated = summarizeCalories(Math.round(caloriesEaten * reveal), calorieGoal);
  const over = final.status === "over";
  const tone = over ? "over" : "lime";
  const accent = over ? "text-over" : "text-white";

  return (
    <section aria-label="Daily energy" className="flex flex-col">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-haspopup="listbox"
          className="flex items-center gap-1 font-body text-12 font-bold tracking-[1.2px] text-lime"
        >
          TODAY
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        <time dateTime={date} className="font-body text-10 font-medium tracking-[1px] text-muted">
          {dayLabel(date)}
        </time>
      </div>

      <div className="mt-[27px] flex items-center justify-between">
        <div className="flex flex-col">
          <p
            className="font-display text-86 leading-none font-bold tracking-[-2px] text-white italic tabular-nums"
            aria-live="off"
          >
            {number.format(animated.eaten)}
          </p>
          <p className="font-body text-11 font-semibold tracking-[1.4px] text-lime">KCAL EATEN</p>
          <p className="sr-only">
            {number.format(final.eaten)} kcal eaten out of {number.format(final.goal)}
          </p>
        </div>

        <CalorieGauge
          progress={animated.progress}
          tone={tone}
          label={
            over
              ? `${number.format(final.over)} kcal over your goal`
              : final.status === "goal-met"
                ? "Goal met"
                : `${number.format(final.remaining)} kcal left`
          }
        >
          {final.status === "goal-met" ? (
            <>
              <Check size={28} strokeWidth={2.5} className="text-lime" aria-hidden="true" />
              <span className="mt-1.5 font-body text-9 font-semibold tracking-[0.8px] text-lime">
                GOAL MET
              </span>
            </>
          ) : (
            <>
              <span
                className={`font-display text-35 leading-none font-semibold italic tabular-nums ${accent}`}
              >
                {number.format(over ? animated.over : animated.remaining)}
              </span>
              <span
                className={`mt-1.5 font-body text-9 font-semibold tracking-[0.8px] ${over ? "text-over" : "text-muted"}`}
              >
                {over ? "KCAL OVER" : "KCAL LEFT"}
              </span>
            </>
          )}
        </CalorieGauge>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p
          className={`font-body text-11 transition-opacity duration-300 ${over ? "text-over" : "text-muted"}`}
          style={{ opacity: reveal }}
        >
          {final.percent}% of your daily goal
        </p>
        <p className="font-body text-10 font-semibold tracking-[0.4px] text-muted">
          GOAL&nbsp;&nbsp;{number.format(final.goal)} KCAL
        </p>
      </div>
    </section>
  );
}
