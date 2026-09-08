import { entryNutrition, type LoggedUnit, type NutritionBasis } from "@calwise/food-rules/log";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { PrimaryAction } from "../../components/primary-action";
import { nutritionFormat } from "../../lib/number-format";

export interface Portion {
  readonly amount: number;
  readonly unit: LoggedUnit;
}
export function PortionEditor({
  basis,
  initial,
  label,
  pending,
  error,
  onSave,
}: {
  readonly basis: NutritionBasis;
  readonly initial?: Portion;
  readonly label: string;
  readonly pending: boolean;
  readonly error?: string | undefined;
  readonly onSave: (portion: Portion) => void;
}) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [unit, setUnit] = useState<LoggedUnit>(initial?.unit ?? "g");
  const id = useId();
  const quantity = Number(amount.replace(",", "."));
  const totals = entryNutrition(basis, quantity);
  const valid =
    /^(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(amount) &&
    quantity > 0 &&
    Number.isFinite(quantity) &&
    Object.values(totals).every(Number.isFinite);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !pending) onSave({ amount: quantity, unit });
      }}
    >
      <fieldset disabled={pending} className="grid grid-cols-2 gap-4">
        <label
          htmlFor={`${id}-amount`}
          className="flex flex-col gap-2 text-9 font-semibold tracking-[1px] text-muted"
        >
          AMOUNT
          <input
            id={`${id}-amount`}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoComplete="off"
            required
            aria-describedby={`${id}-basis`}
            className="h-12 min-w-0 rounded-8 border border-line bg-bg px-3 text-[16px] font-normal tracking-normal text-white outline-none focus:border-lime"
          />
        </label>
        <label className="flex flex-col gap-2 text-9 font-semibold tracking-[1px] text-muted">
          UNIT
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value === "ml" ? "ml" : "g")}
            className="h-12 rounded-8 border border-line bg-bg px-3 text-[16px] font-normal tracking-normal text-white outline-none focus:border-lime"
          >
            <option value="g">g</option>
            <option value="ml">ml</option>
          </select>
        </label>
      </fieldset>
      <p id={`${id}-basis`} className="text-10 text-muted">
        Nutrition per 100 {unit}. Choose the unit matching the label.
      </p>
      <div aria-live="polite">
        <NutritionPreview totals={valid ? totals : null} />
      </div>
      {amount && !valid && (
        <p role="alert" className="text-12 text-danger">
          Enter a valid amount greater than zero.
        </p>
      )}
      {error && (
        <p role="alert" className="text-12 text-danger">
          {error}
        </p>
      )}
      <PrimaryAction compact type="submit" disabled={!valid || pending}>
        {!initial && !pending && <Plus size={23} aria-hidden="true" />}
        {pending ? "SAVING…" : label}
      </PrimaryAction>
    </form>
  );
}

export function NutritionPreview({
  totals,
  prominent = false,
}: {
  readonly totals: ReturnType<typeof entryNutrition> | null;
  readonly prominent?: boolean;
}) {
  return (
    <div className={prominent ? "flex flex-col gap-3" : "flex items-center gap-3"}>
      <div className={prominent ? "" : "shrink-0 border-r border-line pr-3"}>
        <span
          className={`font-display font-bold ${prominent ? "text-60 text-white" : "text-30 text-lime"}`}
        >
          {totals ? nutritionFormat.format(totals.kcal) : "—"}
        </span>
        <span className="ml-1 text-10 text-muted">kcal</span>
      </div>
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
    </div>
  );
}
