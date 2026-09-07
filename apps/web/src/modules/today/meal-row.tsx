import { Apple, ChevronRight, Moon, Utensils, Zap, type LucideIcon } from "lucide-react";
import type { LoggedMeal, MealIcon } from "./today-data";

const icons: Record<MealIcon, LucideIcon> = {
  zap: Zap,
  utensils: Utensils,
  apple: Apple,
  moon: Moon,
};

const number = new Intl.NumberFormat("en-US");

interface MealRowProps {
  readonly meal: LoggedMeal;
  readonly onOpen?: (meal: LoggedMeal) => void;
}

/** One logged meal with its calories ("Component / Meal row"). */
export function MealRow({ meal, onOpen }: MealRowProps) {
  const Icon = icons[meal.icon];
  return (
    <button
      type="button"
      onClick={() => onOpen?.(meal)}
      className="flex h-[72px] w-full items-center gap-3 rounded-10 border border-line bg-surface pr-3.5 pl-3.5 text-left transition-colors hover:border-muted active:bg-canvas"
    >
      <span className="flex w-[30px] shrink-0 justify-center text-lime">
        <Icon size={25} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <span className="font-display text-18 leading-[22px] font-semibold tracking-[0.3px] text-white uppercase italic">
          {meal.name}
        </span>
        <span className="truncate font-body text-10 text-muted">{meal.foods}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="font-display text-23 leading-[28px] font-semibold text-white tabular-nums">
          {number.format(meal.kcal)}
        </span>
        <span className="font-body text-8 tracking-[0.6px] text-muted">KCAL</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
    </button>
  );
}
