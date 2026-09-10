import { nutritionFormat as grams } from "../../lib/number-format";
export const MACRO_KEYS = ["protein", "carbs", "fat"] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];
export const MACRO_LABELS: Record<MacroKey, string> = {
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

export interface MacroIntake {
  readonly key: MacroKey;
  readonly consumed: number;
  readonly target: number;
}

/**
 * Rules from the "Daily counter states" board:
 * bars stop at 100%, excess stays visible as a number and never as a negative remainder,
 * amber appears only after a target is exceeded, never for approaching it.
 */

export type CalorieStatus = "not-started" | "in-progress" | "goal-met" | "over";

export interface CalorieSummary {
  readonly eaten: number;
  readonly goal: number;
  /** Calories still available, never negative. */
  readonly remaining: number;
  /** Calories beyond the goal, zero unless the goal is exceeded. */
  readonly over: number;
  /** Whole percent of the goal eaten, may exceed 100. */
  readonly percent: number;
  /** Share of the goal eaten, capped at 1 for gauges. */
  readonly progress: number;
  readonly status: CalorieStatus;
}

export function summarizeCalories(eaten: number, goal: number): CalorieSummary {
  const difference = goal - eaten;
  const status: CalorieStatus =
    eaten <= 0
      ? "not-started"
      : difference > 0
        ? "in-progress"
        : difference === 0
          ? "goal-met"
          : "over";
  return {
    eaten,
    goal,
    remaining: Math.max(difference, 0),
    over: Math.max(-difference, 0),
    percent: goal > 0 ? Math.round((eaten / goal) * 100) : 0,
    progress: goal > 0 ? Math.min(eaten / goal, 1) : 0,
    status,
  };
}

export interface MacroSummary extends MacroIntake {
  readonly label: string;
  /** Share of the target consumed, capped at 1 so bars stay inside their tracks. */
  readonly progress: number;
  /** Grams beyond the target, zero unless exceeded. */
  readonly over: number;
}

export function summarizeMacro(macro: MacroIntake): MacroSummary {
  return {
    ...macro,
    label: MACRO_LABELS[macro.key],
    progress: macro.target > 0 ? Math.min(macro.consumed / macro.target, 1) : 0,
    over: Math.max(macro.consumed - macro.target, 0),
  };
}

/** Explanation shown under the macro counters when at least one target is exceeded. */
export function macroOverTargetNote(macros: readonly MacroSummary[]): string | null {
  const over = macros.filter((macro) => macro.over > 0);
  const first = over[0];
  if (first === undefined) return null;
  if (over.length === 1) {
    return `${first.label} is ${grams.format(first.over)} g over its ${grams.format(first.target)} g target.`;
  }
  const parts = over.map((macro) => `${macro.label.toLowerCase()} +${grams.format(macro.over)} g`);
  return `Over target: ${parts.join(" · ")}`;
}
