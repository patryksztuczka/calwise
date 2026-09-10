import {
  entryNutrition,
  isValidPortion,
  LOGGED_UNITS,
  parseAmount,
  type Portion,
  type LoggedUnit,
  type NutritionBasis,
} from "@calwise/food-rules/log";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { PrimaryAction } from "../../components/primary-action";
import { NutritionPreview } from "./nutrition-preview";

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
  const quantity = parseAmount(amount);
  const portion =
    quantity !== null && isValidPortion(basis, quantity) ? { amount: quantity, unit } : null;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (portion && !pending) onSave(portion);
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
            onChange={(event) =>
              setUnit(LOGGED_UNITS.find((item) => item === event.target.value) ?? "g")
            }
            className="h-12 rounded-8 border border-line bg-bg px-3 text-[16px] font-normal tracking-normal text-white outline-none focus:border-lime"
          >
            {LOGGED_UNITS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <p id={`${id}-basis`} className="text-10 text-muted">
        Nutrition per 100 {unit}. Choose the unit matching the label.
      </p>
      <div aria-live="polite">
        <NutritionPreview totals={portion && entryNutrition(basis, portion.amount)} />
      </div>
      {amount && !portion && (
        <p role="alert" className="text-12 text-danger">
          Enter a valid amount greater than zero.
        </p>
      )}
      {error && (
        <p role="alert" className="text-12 text-danger">
          {error}
        </p>
      )}
      <PrimaryAction size="compact" type="submit" disabled={!portion || pending}>
        {!initial && !pending && <Plus size={23} aria-hidden="true" />}
        {pending ? "SAVING…" : label}
      </PrimaryAction>
    </form>
  );
}
