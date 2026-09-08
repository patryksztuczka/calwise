import type { inferOutput } from "@trpc/tanstack-react-query";
import type { useTRPC } from "../../lib/trpc";
import { isLogDate, localDate, MEAL_SLOTS, type MealSlot } from "@calwise/food-rules/log";
import { useSearchParams } from "react-router";

export type FoodEntry = inferOutput<ReturnType<typeof useTRPC>["foodLog"]["entry"]>;
export interface Destination {
  readonly date: string;
  readonly meal: MealSlot;
}
export function timeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
export function mealUrl({ date, meal }: Destination) {
  return `/meal/${meal}?date=${date}`;
}
export function loggingUrl({ date, meal }: Destination) {
  return `/log-food?date=${date}&meal=${meal}`;
}
export function useLogDestination() {
  const [params, setParams] = useSearchParams();
  const rawDate = params.get("date") ?? "";
  const today = localDate();
  const date = isLogDate(rawDate) && rawDate <= today ? rawDate : today;
  const meal = MEAL_SLOTS.find((slot) => slot === params.get("meal")) ?? null;
  function setDestination(value: Destination) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("date", value.date);
        next.set("meal", value.meal);
        return next;
      },
      { replace: true },
    );
  }
  return { date, meal, setDestination };
}
