import { Apple, ChevronRight, Moon, Utensils, Zap, type LucideIcon } from "lucide-react";
import { numberFormat as number } from "../../lib/number-format";
import { MEAL_NAMES, type MealSlot } from "@calwise/food-rules/log";

const icons: Record<MealSlot, LucideIcon> = {
  breakfast: Zap,
  lunch: Utensils,
  snacks: Apple,
  dinner: Moon,
};

interface MealRowProps {
  readonly meal: MealSlot;
  readonly kcal: number;
  readonly foods: readonly string[];
  readonly onOpen?: () => void;
}

/** One logged meal with its calories ("Component / Meal row"). */
export function MealRow({ meal, kcal, foods, onOpen }: MealRowProps) {
  const Icon = icons[meal];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-[72px] w-full items-center gap-3 rounded-10 border border-line bg-surface pr-3.5 pl-3.5 text-left transition-colors hover:border-muted active:bg-canvas"
    >
      <span className="flex w-[30px] shrink-0 justify-center text-lime">
        <Icon size={25} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <span className="font-display text-18 leading-[22px] font-semibold tracking-[0.3px] text-white uppercase italic">
          {MEAL_NAMES[meal]}
        </span>
        <span className="truncate font-body text-10 text-muted">
          {foods.length ? foods.join(", ") : "Add food"}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="font-display text-23 leading-[28px] font-semibold text-white tabular-nums">
          {number.format(kcal)}
        </span>
        <span className="font-body text-8 tracking-[0.6px] text-muted">KCAL</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
    </button>
  );
}
