import { isLoggableDate, localDate, MEAL_SLOTS, type Destination } from "@calwise/food-rules/log";
import { useSearchParams } from "react-router";
import { usePatchSearchParams } from "../../lib/patch-search-params";

/** A destination the user is still choosing: the date is always known, the meal may not be. */
export interface DestinationDraft {
  readonly date: string;
  readonly meal: Destination["meal"] | null;
}

export function mealUrl({ date, meal }: Destination) {
  return `/meal/${meal}?date=${date}`;
}
export function loggingUrl({ date, meal }: Destination) {
  return `/log-food?date=${date}&meal=${meal}`;
}

/** The log destination carried in the query string: `date` falls back to today, `meal` to null. */
export function useLogDestination() {
  const [params] = useSearchParams();
  const patchParams = usePatchSearchParams();
  const rawDate = params.get("date") ?? "";
  const today = localDate();
  const date = isLoggableDate(rawDate, today) ? rawDate : today;
  const meal = MEAL_SLOTS.find((slot) => slot === params.get("meal")) ?? null;
  function setDate(value: string) {
    patchParams({ date: value });
  }
  function setDestination(value: Destination) {
    patchParams({ date: value.date, meal: value.meal });
  }
  return { date, meal, setDate, setDestination };
}
