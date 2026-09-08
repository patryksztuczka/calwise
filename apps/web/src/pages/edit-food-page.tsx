import { MEAL_NAMES } from "@calwise/food-rules/log";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRightLeft, ChevronRight, Utensils } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { IconButton } from "../components/icon-button";
import { useTRPC } from "../lib/trpc";
import { LogQueryState } from "../modules/food-log/date-navigation";
import { DestinationPicker } from "../modules/food-log/destination-picker";
import { mealUrl, timeZone, type Destination, type FoodEntry } from "../modules/food-log/log-types";
import { PortionEditor } from "../modules/food-log/portion-editor";

export default function EditFoodPage() {
  const { id = "" } = useParams();
  const trpc = useTRPC();
  const query = useQuery(trpc.foodLog.entry.queryOptions({ id }));
  if (query.isPending || query.isError)
    return (
      <>
        <Link to="/" className="text-lime">
          Back to daily overview
        </Link>
        <LogQueryState failed={query.isError} retry={() => void query.refetch()} />
      </>
    );
  return <EntryEditor entry={query.data} />;
}

function EntryEditor({ entry }: { readonly entry: FoodEntry }) {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [moving, setMoving] = useState(false);
  const [undo, setUndo] = useState<Destination | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [message, setMessage] = useState("");
  const update = useMutation(
    trpc.foodLog.update.mutationOptions({
      onSuccess: (saved) => {
        cache.setQueryData(trpc.foodLog.entry.queryKey({ id: entry.id }), saved);
        void cache.invalidateQueries(trpc.foodLog.pathFilter());
      },
    }),
  );
  const remove = useMutation(
    trpc.foodLog.remove.mutationOptions({
      onSuccess: () => {
        void cache.invalidateQueries(trpc.foodLog.pathFilter());
        void navigate(mealUrl(entry));
      },
    }),
  );
  const pending = update.isPending || remove.isPending;
  function move(destination: Destination, reverting: boolean) {
    update.mutate(
      {
        id: entry.id,
        amount: entry.amount,
        unit: entry.unit,
        ...destination,
        timeZone: timeZone(),
      },
      {
        onSuccess: () => {
          setMoving(false);
          setUndo(reverting ? null : { date: entry.date, meal: entry.meal });
          setMessage(
            reverting
              ? "Move undone"
              : `Moved to ${MEAL_NAMES[destination.meal]} · ${destination.date}`,
          );
        },
      },
    );
  }
  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col gap-5">
      <header className="flex items-center gap-3">
        <IconButton render={<Link to={mealUrl(entry)} aria-label="Back to meal" />}>
          <ArrowLeft size={21} />
        </IconButton>
        <h1 className="font-display text-30 font-bold italic">EDIT FOOD</h1>
      </header>
      <p className="text-11 font-semibold text-lime">
        {MEAL_NAMES[entry.meal].toUpperCase()} · {entry.date}
      </p>
      <div className="flex flex-col gap-5 rounded-12 border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <Utensils size={24} className="text-muted" />
          <div>
            <h2 className="text-14 font-semibold">{entry.name}</h2>
            <p className="text-11 text-muted">{entry.brands}</p>
          </div>
        </div>
        <PortionEditor
          key={`${entry.id}:${entry.amount}:${entry.unit}`}
          basis={entry}
          initial={entry}
          label="SAVE CHANGES"
          pending={pending}
          onSave={(portion) =>
            update.mutate(
              {
                id: entry.id,
                date: entry.date,
                meal: entry.meal,
                timeZone: timeZone(),
                ...portion,
              },
              {
                onSuccess: () => {
                  setMessage("Changes saved");
                  setUndo(null);
                },
              },
            )
          }
        />
      </div>
      {update.isError || remove.isError ? (
        <p role="alert" className="text-12 text-danger">
          Could not save this change. Try again.
        </p>
      ) : null}
      {message && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-12 border border-lime/30 bg-lime/10 p-3 text-12"
        >
          <span>{message}</span>
          {undo && (
            <button
              type="button"
              disabled={pending}
              onClick={() => move(undo, true)}
              className="min-h-11 text-lime"
            >
              Undo
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => setMoving(true)}
        className="flex min-h-14 items-center gap-3 border-y border-line text-13"
      >
        <ArrowRightLeft size={20} className="text-lime" />
        <span className="flex-1 text-left">Move to…</span>
        <ChevronRight size={18} className="text-muted" />
      </button>
      <p className="text-11 leading-relaxed text-muted">
        Choose another meal or day for this entry.
        <br />
        The food and portion stay the same.
      </p>
      {moving && (
        <DestinationPicker
          title="MOVE FOOD"
          pending={pending}
          error={update.isError ? "Could not move this food. Try again." : undefined}
          initial={entry}
          onClose={() => {
            if (!pending) setMoving(false);
          }}
          onChoose={(destination) => {
            if (!pending) move(destination, false);
          }}
        />
      )}
      <div className="mt-auto pt-8">
        {confirmRemove ? (
          <div className="flex flex-col gap-3">
            <p className="text-13">Remove this food entry?</p>
            <div className="flex gap-6">
              <button
                type="button"
                disabled={pending}
                onClick={() => remove.mutate({ id: entry.id })}
                className="min-h-11 text-12 text-danger"
              >
                Confirm removal
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmRemove(false)}
                className="min-h-11 text-12"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmRemove(true)}
            className="min-h-11 text-12 text-danger"
          >
            Remove food
          </button>
        )}
      </div>
    </div>
  );
}
