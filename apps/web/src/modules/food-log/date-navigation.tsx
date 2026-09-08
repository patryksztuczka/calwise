import { isLogDate, localDate } from "@calwise/food-rules/log";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DateNavigation({
  date,
  onChange,
}: {
  readonly date: string;
  readonly onChange: (date: string) => void;
}) {
  function shift(days: number) {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + days);
    onChange(localDate(value));
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        aria-label="Previous day"
        onClick={() => shift(-1)}
        className="flex size-11 items-center justify-center"
      >
        <ChevronLeft size={20} />
      </button>
      <label>
        <span className="sr-only">View date</span>
        <input
          type="date"
          value={date}
          max={localDate()}
          onChange={(event) => {
            const value = event.target.value;
            if (isLogDate(value) && value <= localDate()) onChange(value);
          }}
          className="rounded-8 border border-line bg-surface p-2 text-12 [color-scheme:dark]"
        />
      </label>
      <button
        type="button"
        aria-label="Next day"
        disabled={date >= localDate()}
        onClick={() => shift(1)}
        className="flex size-11 items-center justify-center disabled:opacity-30"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export function LogQueryState({
  failed,
  retry,
}: {
  readonly failed: boolean;
  readonly retry: () => void;
}) {
  return failed ? (
    <div role="alert" className="py-10 text-13">
      <p className="text-danger">Could not load your food log.</p>
      <button type="button" onClick={retry} className="min-h-11 text-lime">
        Try again
      </button>
    </div>
  ) : (
    <div
      role="status"
      aria-label="Loading food log"
      className="space-y-4 py-5 motion-safe:animate-pulse"
    >
      <div className="h-40 rounded-12 bg-skeleton" />
      <div className="h-20 rounded-12 bg-skeleton" />
      <div className="h-20 rounded-12 bg-skeleton" />
    </div>
  );
}
