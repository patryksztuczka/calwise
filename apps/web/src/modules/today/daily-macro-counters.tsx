import { nutritionFormat as grams } from "../../lib/number-format";
import { macroOverTargetNote, summarizeMacro } from "./daily-summary";
import type { MacroIntake } from "./today-data";

/** Protein, carbs and fat against their daily targets ("Component / Daily macro counters"). */
export function DailyMacroCounters({ macros }: { readonly macros: readonly MacroIntake[] }) {
  const summaries = macros.map(summarizeMacro);
  const note = macroOverTargetNote(summaries);
  return (
    <section aria-label="Macronutrients" className="border-y border-line py-[15px]">
      <dl className="grid grid-cols-3">
        {summaries.map((macro, index) => {
          const over = macro.over > 0;
          return (
            <div
              key={macro.key}
              className={`flex flex-col gap-1.5 pl-3 pr-3 ${index < summaries.length - 1 ? "border-r border-line" : ""}`}
            >
              <dt className="font-body text-9 font-semibold tracking-[0.8px] text-muted uppercase">
                {macro.label}
              </dt>
              <dd className="flex items-center gap-1">
                <span
                  className={`min-w-[56px] font-display text-25 leading-[30px] font-semibold italic ${over ? "text-over" : "text-white"}`}
                >
                  {grams.format(macro.consumed)}g
                </span>
                <span className="font-body text-9 text-muted">/ {grams.format(macro.target)}</span>
                <span className="sr-only">
                  grams{over ? `, ${grams.format(macro.over)} g over target` : ""}
                </span>
              </dd>
              <div
                className="h-1 w-full overflow-hidden rounded-2 bg-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={macro.target}
                aria-valuenow={Math.min(macro.consumed, macro.target)}
                aria-label={`${macro.label} progress`}
              >
                <div
                  className={`h-full rounded-2 transition-[width] duration-700 ease-reveal ${over ? "bg-over" : "bg-lime"}`}
                  style={{ width: `${macro.progress * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </dl>
      {note && <p className="mt-2 px-3 font-body text-10 text-over">{note}</p>}
    </section>
  );
}
