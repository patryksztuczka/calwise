import type { entryNutrition } from "@calwise/food-rules/log";
import { nutritionFormat } from "../../lib/number-format";

type Totals = ReturnType<typeof entryNutrition>;

export function NutritionPreview({ totals }: { readonly totals: Totals | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 border-r border-line pr-3">
        <span className="font-display text-30 font-bold text-lime">
          {totals ? nutritionFormat.format(totals.kcal) : "—"}
        </span>
        <span className="ml-1 text-10 text-muted">kcal</span>
      </div>
      <MacroTotals totals={totals} />
    </div>
  );
}

export function MealNutritionSummary({ totals }: { readonly totals: Totals }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="font-display text-60 font-bold text-white">
          {nutritionFormat.format(totals.kcal)}
        </span>
        <span className="ml-1 text-10 text-muted">kcal</span>
      </div>
      <MacroTotals totals={totals} />
    </div>
  );
}

function MacroTotals({ totals }: { readonly totals: Totals | null }) {
  return (
    <div className="grid flex-1 grid-cols-3 gap-2">
      {(
        [
          ["protein", "PROTEIN"],
          ["carbs", "CARBS"],
          ["fat", "FAT"],
        ] as const
      ).map(([key, name]) => (
        <div key={key}>
          <p className="text-9 text-muted">{name}</p>
          <p className="text-12 font-semibold">
            {totals ? nutritionFormat.format(totals[key]) : "—"} g
          </p>
        </div>
      ))}
    </div>
  );
}
