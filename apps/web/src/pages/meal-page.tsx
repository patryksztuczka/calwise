import { entryNutrition, MEAL_NAMES, MEAL_SLOTS, sumNutrition } from "@calwise/food-rules/log";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Plus, Utensils } from "lucide-react";
import { Link, Navigate, useParams } from "react-router";
import { IconButton } from "../components/icon-button";
import { PrimaryAction } from "../components/primary-action";
import { nutritionFormat } from "../lib/number-format";
import { useTRPC } from "../lib/trpc";
import { LogQueryState } from "../modules/food-log/log-query-state";
import { loggingUrl, useLogDestination } from "../modules/food-log/destination";
import { MealNutritionSummary } from "../modules/food-log/nutrition-preview";

export default function MealPage() {
  const { meal: rawMeal } = useParams();
  const meal = MEAL_SLOTS.find((slot) => slot === rawMeal);
  const { date } = useLogDestination();
  const trpc = useTRPC();
  const query = useQuery(trpc.foodLog.day.queryOptions({ date }));
  if (!meal) return <Navigate to="/" replace />;
  const entries = (query.data ?? []).filter((entry) => entry.meal === meal);
  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col gap-5">
      <header className="flex items-center gap-3">
        <IconButton render={<Link to={`/?date=${date}`} aria-label="Back to daily overview" />}>
          <ArrowLeft size={21} />
        </IconButton>
        <h1 className="font-display text-30 font-bold italic">{MEAL_NAMES[meal].toUpperCase()}</h1>
      </header>
      <p className="text-11 font-semibold text-lime">{date}</p>
      {query.isPending || query.isError ? (
        <LogQueryState failed={query.isError} retry={() => void query.refetch()} />
      ) : (
        <>
          <MealNutritionSummary totals={sumNutrition(entries)} />
          <div className="mt-5 flex justify-between border-t border-line pt-5 text-11">
            <h2 className="font-semibold tracking-[1px]">FOODS</h2>
            <span className="text-muted">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {entries.length === 0 ? (
            <p className="py-8 text-center text-13 text-muted">No food logged yet.</p>
          ) : (
            <ul>
              {entries.map((entry) => (
                <li key={entry.id} className="border-b border-line">
                  <Link
                    to={`/food-entry/${entry.id}`}
                    className="flex min-h-[84px] items-center gap-3"
                  >
                    <span className="flex size-[42px] shrink-0 items-center justify-center rounded-8 bg-surface">
                      <Utensils size={20} className="text-muted" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-14 font-semibold">{entry.name}</p>
                      {entry.brands && (
                        <p className="truncate text-11 text-muted">{entry.brands}</p>
                      )}
                      <p className="text-11 text-muted">
                        {nutritionFormat.format(entryNutrition(entry, entry.amount).kcal)} kcal ·{" "}
                        {entry.amount} {entry.unit}
                      </p>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="text-11 text-muted">Tap a food to edit its portion or move it.</p>
          <p className="text-10 text-muted">
            Nutrition from{" "}
            <a href="https://world.openfoodfacts.org" className="underline">
              Open Food Facts contributors
            </a>
            , ODbL.
          </p>
        </>
      )}
      <div className="mt-auto pt-5">
        <PrimaryAction render={<Link to={loggingUrl({ date, meal })} />}>
          <Plus size={22} /> ADD FOOD
        </PrimaryAction>
      </div>
    </div>
  );
}
