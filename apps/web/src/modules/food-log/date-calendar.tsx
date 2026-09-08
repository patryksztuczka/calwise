import { localDate } from "@calwise/food-rules/log";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { PrimaryAction } from "../../components/primary-action";

const monthFormat = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

export function DateCalendar({
  initial,
  onChoose,
  mealName,
}: {
  readonly initial: string;
  readonly onChoose: (date: string) => void;
  readonly mealName?: string | undefined;
}) {
  const [selected, setSelected] = useState(initial);
  const [month, setMonth] = useState(() => new Date(`${initial.slice(0, 7)}-01T12:00:00`));
  const today = localDate();
  const firstWeekday = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  function shiftMonth(delta: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1, 12));
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-8 bg-surface">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
          className="flex size-11 items-center justify-center"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-13">{monthFormat.format(month)}</p>
        <button
          type="button"
          aria-label="Next month"
          disabled={localDate(month).slice(0, 7) >= today.slice(0, 7)}
          onClick={() => shiftMonth(1)}
          className="flex size-11 items-center justify-center disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div
        className="grid grid-cols-7 gap-y-2 text-center text-12"
        role="group"
        aria-label="Choose log date"
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span key={day} className="py-2 text-10 text-muted">
            {day.slice(0, 1)}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const date = `${localDate(month).slice(0, 7)}-${String(index + 1).padStart(2, "0")}`;
          return (
            <button
              key={date}
              type="button"
              aria-label={date}
              aria-pressed={selected === date}
              disabled={date > today}
              onClick={() => setSelected(date)}
              className={`mx-auto flex h-11 w-full max-w-11 items-center justify-center rounded-8 border disabled:opacity-25 ${selected === date ? "border-lime bg-lime font-semibold text-bg" : date === today ? "border-line" : "border-transparent"}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <p className="text-11 leading-relaxed text-muted">
        Selected: {selected}
        {mealName && (
          <>
            <br />
            Your meal choice stays {mealName}.
          </>
        )}
      </p>
      <PrimaryAction onClick={() => onChoose(selected)}>
        USE {dayFormat.format(new Date(`${selected}T12:00:00`)).toUpperCase()}
      </PrimaryAction>
    </div>
  );
}
