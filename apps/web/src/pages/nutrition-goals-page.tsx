import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { localDate } from "@calwise/food-rules/log";
import {
  allocatedPercent,
  goalTargets,
  KCAL_PER_GRAM,
  MACROS,
  validGoals,
  type NutritionGoals,
} from "@calwise/food-rules/goals";
import { IconButton } from "../components/icon-button";
import { PrimaryAction } from "../components/primary-action";
import { useTRPC } from "../lib/trpc";
import { LogQueryState } from "../modules/food-log/log-query-state";

export default function NutritionGoalsPage() {
  const trpc = useTRPC();
  const query = useQuery(trpc.profile.goals.queryOptions({ date: localDate() }));
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <IconButton render={<Link to="/profile" />} aria-label="Back to profile">
          <ArrowLeft size={20} />
        </IconButton>
        <h1 className="font-display text-30 font-extrabold italic">NUTRITION GOALS</h1>
      </header>
      <p className="text-13 text-muted">Set your daily calories and how you want to split them.</p>
      {query.isPending || query.isError ? (
        <LogQueryState failed={query.isError} retry={() => void query.refetch()} />
      ) : (
        <GoalsForm initial={query.data} />
      )}
    </div>
  );
}

function GoalsForm({ initial }: { readonly initial: NutritionGoals }) {
  const [mode, setMode] = useState(initial.mode);
  const [fields, setFields] = useState({
    kcal: String(initial.kcal),
    protein: String(initial.protein),
    carbs: String(initial.carbs),
    fat: String(initial.fat),
  });
  const goals: NutritionGoals = {
    mode,
    kcal: Number(fields.kcal),
    protein: Number(fields.protein),
    carbs: Number(fields.carbs),
    fat: Number(fields.fat),
  };
  const valid = Object.values(fields).every((value) => value.trim() !== "") && validGoals(goals);
  const targets = goalTargets(goals);
  const percent = allocatedPercent(goals);
  const trpc = useTRPC();
  const client = useQueryClient();
  const navigate = useNavigate();
  const save = useMutation(
    trpc.profile.saveGoals.mutationOptions({
      onSuccess: async () => {
        await client.invalidateQueries({ queryKey: trpc.profile.goals.queryKey() });
        void navigate("/profile");
      },
    }),
  );
  function switchMode(next: NutritionGoals["mode"]) {
    if (next === mode) return;
    const values =
      next === "grams"
        ? targets
        : {
            protein: Number((((goals.protein * 4) / goals.kcal) * 100).toFixed(2)),
            carbs: Number((((goals.carbs * 4) / goals.kcal) * 100).toFixed(2)),
          };
    setFields({
      kcal: fields.kcal,
      protein: String(values.protein),
      carbs: String(values.carbs),
      fat: String(
        next === "grams" ? targets.fat : Number((100 - values.protein - values.carbs).toFixed(2)),
      ),
    });
    setMode(next);
  }
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !save.isPending)
          save.mutate({ goals, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      }}
    >
      <fieldset disabled={save.isPending} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2 text-11 font-semibold tracking-[1px]">
          DAILY CALORIE GOAL
          <span className="flex items-center rounded-12 border border-line bg-surface px-4 py-3">
            <input
              aria-label="Daily calorie goal"
              type="number"
              min="1"
              max="100000"
              step="1"
              required
              value={fields.kcal}
              onChange={(event) => setFields({ ...fields, kcal: event.target.value })}
              className="min-w-0 flex-1 bg-transparent font-display text-35 font-bold italic"
            />
            <span className="text-10 font-normal tracking-normal text-muted">kcal / day</span>
          </span>
        </label>
        <div>
          <h2 className="mb-3 text-11 font-semibold tracking-[1px]">MACRO DISTRIBUTION</h2>
          <div
            className="flex rounded-12 border border-line bg-surface p-1"
            aria-label="Macro input mode"
          >
            {(["percentages", "grams"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => switchMode(value)}
                className={`flex-1 rounded-8 py-2.5 text-12 capitalize ${mode === value ? "bg-lime font-semibold text-bg" : "text-muted"}`}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="mt-3 text-11 text-muted">
            {mode === "percentages"
              ? "Set percentages. Daily grams update automatically."
              : "Set daily grams to match your calorie goal."}
          </p>
        </div>
        {MACROS.map((key, index) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <label
              htmlFor={key}
              className={`border-l-4 pl-3 ${index === 0 ? "border-lime" : index === 1 ? "border-white" : "border-muted"}`}
            >
              <span className="text-14 font-semibold capitalize">{key}</span>
              <span className="mt-1 block text-10 text-muted">
                {KCAL_PER_GRAM[key]} kcal per gram
              </span>
            </label>
            <div className="w-28">
              <div className="flex items-center gap-2 rounded-8 border border-line bg-surface px-3 py-2.5">
                <input
                  id={key}
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={fields[key]}
                  onChange={(event) => setFields({ ...fields, [key]: event.target.value })}
                  className="w-full min-w-0 bg-transparent text-right text-14"
                />
                <span className="text-11 text-muted">{mode === "percentages" ? "%" : "g"}</span>
              </div>
              <p className="mt-2 text-right text-10 text-muted">
                {Number.isFinite(targets[key]) ? targets[key] : 0} g / day
              </p>
            </div>
          </div>
        ))}
      </fieldset>
      <div aria-live="polite">
        <div className="mb-3 flex h-2 overflow-hidden bg-track">
          {MACROS.map((key, index) => (
            <div
              key={key}
              className={index === 0 ? "bg-lime" : index === 1 ? "bg-white" : "bg-muted"}
              style={{
                width: `${Math.max(0, Math.min(100, mode === "percentages" ? goals[key] : ((goals[key] * KCAL_PER_GRAM[key]) / goals.kcal) * 100)) || 0}%`,
              }}
            />
          ))}
        </div>
        <p className={`flex items-center gap-2 text-12 ${valid ? "text-lime" : "text-over"}`}>
          <CircleCheck size={16} />
          {Number.isFinite(percent) ? Number(percent.toFixed(1)) : 0}% allocated
        </p>
        {!valid && (
          <p className="mt-2 text-11 text-over">
            Enter a positive calorie goal and non-negative macros.{" "}
            {mode === "percentages"
              ? "Percentages must total 100%."
              : "Calories from grams must match your goal, allowing for rounding."}
          </p>
        )}
        <p className="mt-3 text-10 text-muted">Gram targets are rounded to the nearest gram.</p>
      </div>
      {save.isError && (
        <p role="alert" className="text-13 text-danger">
          Couldn't save your goals. Please try again.
        </p>
      )}
      <div className="mt-2">
        <p className="mb-3 text-center text-11 text-muted">
          From today. Previous days stay unchanged.
        </p>
        <PrimaryAction type="submit" disabled={!valid || save.isPending}>
          {save.isPending ? "SAVING..." : "SAVE GOALS"}
        </PrimaryAction>
      </div>
    </form>
  );
}
