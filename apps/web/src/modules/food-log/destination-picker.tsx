import { localDate, MEAL_NAMES, MEAL_SLOTS, isLogDate } from "@calwise/food-rules/log";
import { CalendarDays, Check, ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { PrimaryAction } from "../../components/primary-action";
import type { Destination } from "./log-types";
import { DateCalendar } from "./date-calendar";

export function DestinationPicker({
  initial,
  onChoose,
  onClose,
  title = "ASSIGN TO MEAL",
  pending = false,
  error,
}: {
  readonly initial: { readonly date: string; readonly meal: Destination["meal"] | null };
  readonly onChoose: (value: Destination) => void;
  readonly onClose: () => void;
  readonly title?: string;
  readonly pending?: boolean;
  readonly error?: string | undefined;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [date, setDate] = useState(initial.date);
  const [meal, setMeal] = useState(initial.meal);
  const [choosingDate, setChoosingDate] = useState(false);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-x-0 top-auto bottom-0 mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-20 border border-line bg-bg p-5 pb-[max(24px,env(safe-area-inset-bottom))] text-white backdrop:bg-bg/80 sm:bottom-6 sm:rounded-b-36"
    >
      <div className="mx-auto mb-5 h-1 w-10 rounded-2 bg-line" />
      <header className="mb-5 flex items-center justify-between">
        <h2 id={heading} className="font-display text-24 font-bold italic">
          {choosingDate ? "CHOOSE DATE" : title}
        </h2>
        <button
          type="button"
          aria-label="Close destination picker"
          onClick={onClose}
          disabled={pending}
          className="flex size-11 items-center justify-center rounded-full border border-line"
        >
          <X size={20} />
        </button>
      </header>
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
            {title === "ASSIGN TO MEAL" && (
              <p className="mb-5 text-11 leading-relaxed text-muted">
                Only new additions go to this meal.
                <br />
                Foods already added stay where they are.
              </p>
            )}
            <PrimaryAction
              disabled={!meal || !isLogDate(date) || date > localDate()}
              onClick={() => {
                if (meal) onChoose({ date, meal });
              }}
            >
              USE {meal ? MEAL_NAMES[meal].toUpperCase() : "MEAL"}
            </PrimaryAction>
          </>
        )}
      </fieldset>
    </dialog>
  );
}

export function DestinationControl({
  destination,
  onChoose,
}: {
  readonly destination: { readonly date: string; readonly meal: Destination["meal"] | null };
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
