import {
  localDate,
  MEAL_NAMES,
  MEAL_SLOTS,
  isLoggableDate,
  type Destination,
} from "@calwise/food-rules/log";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { PrimaryAction } from "../../components/primary-action";
import { BottomSheet } from "../../components/bottom-sheet";
import { DateCalendar } from "./date-calendar";
import type { DestinationDraft } from "./destination";

export function DestinationPicker({
  initial,
  onChoose,
  onClose,
  purpose = "assign",
  pending = false,
  error,
}: {
  readonly initial: DestinationDraft;
  readonly onChoose: (value: Destination) => void;
  readonly onClose: () => void;
  readonly purpose?: "assign" | "move";
  readonly pending?: boolean;
  readonly error?: string | undefined;
}) {
  const [date, setDate] = useState(initial.date);
  const [meal, setMeal] = useState(initial.meal);
  const [choosingDate, setChoosingDate] = useState(false);
  return (
    <BottomSheet
      title={choosingDate ? "CHOOSE DATE" : purpose === "assign" ? "ASSIGN TO MEAL" : "MOVE FOOD"}
      onClose={onClose}
      pending={pending}
      closeLabel="Close destination picker"
    >
      {error && (
        <p role="alert" className="mb-3 text-12 text-danger">
          {error}
        </p>
      )}
      <fieldset disabled={pending}>
        {choosingDate ? (
          <DateCalendar
            initial={date}
            mealName={meal ? MEAL_NAMES[meal] : undefined}
            onChoose={(value) => {
              setDate(value);
              setChoosingDate(false);
            }}
          />
        ) : (
          <>
            <button
              type="button"
              aria-label="Change log date"
              onClick={() => setChoosingDate(true)}
              className="flex min-h-12 w-full items-center gap-3 rounded-8 bg-surface p-3 text-14"
            >
              <CalendarDays size={20} className="text-muted" />
              {date === localDate() ? `Today, ${date}` : date}
            </button>
            <div className="my-4 flex flex-col gap-2" role="group" aria-label="Meal">
              {MEAL_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={meal === slot}
                  onClick={() => setMeal(slot)}
                  className={`flex min-h-12 items-center justify-between rounded-8 border px-4 text-14 ${meal === slot ? "border-lime bg-lime/10 text-lime" : "border-transparent"}`}
                >
                  {MEAL_NAMES[slot]}
                  {meal === slot && <Check size={18} />}
                </button>
              ))}
            </div>
            {purpose === "assign" && (
              <p className="mb-5 text-11 leading-relaxed text-muted">
                Only new additions go to this meal.
                <br />
                Foods already added stay where they are.
              </p>
            )}
            <PrimaryAction
              disabled={!meal || !isLoggableDate(date, localDate())}
              onClick={() => {
                if (meal) onChoose({ date, meal });
              }}
            >
              USE {meal ? MEAL_NAMES[meal].toUpperCase() : "MEAL"}
            </PrimaryAction>
          </>
        )}
      </fieldset>
    </BottomSheet>
  );
}

export function DestinationControl({
  destination,
  onChoose,
}: {
  readonly destination: DestinationDraft;
  readonly onChoose: (value: Destination) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center gap-3 text-11"
      >
        <span className="text-9 tracking-[1px] text-muted">ADDING TO</span>
        <span className="flex items-center gap-1 font-semibold text-lime">
          {destination.meal ? MEAL_NAMES[destination.meal] : "Choose meal"}
          <ChevronDown size={14} />
        </span>
        <span className="ml-auto text-muted">
          {destination.date === localDate() ? "Today" : destination.date}
        </span>
      </button>
      {open && (
        <DestinationPicker
          initial={destination}
          onClose={() => setOpen(false)}
          onChoose={(value) => {
            onChoose(value);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
