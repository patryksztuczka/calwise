import { MEAL_NAMES, type Destination, type EntryChange } from "@calwise/food-rules/log";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRightLeft, ChevronRight, Utensils } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { IconButton } from "../components/icon-button";
import { useTRPC } from "../lib/trpc";
import { LogQueryState } from "../modules/food-log/log-query-state";
import { DestinationPicker } from "../modules/food-log/destination-picker";
import { mealUrl } from "../modules/food-log/destination";
import type { FoodEntry } from "../modules/food-log/food-log-types";
import { RemoveFood } from "../modules/food-log/remove-food";
import { ChangeNotice, type EntryAction } from "../modules/food-log/change-notice";
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
  const [lastAction, setLastAction] = useState<EntryAction | null>(null);
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
  const error =
    update.isError || remove.isError ? "Could not save this change. Try again." : undefined;
  function move(destination: Destination, action: EntryAction) {
    save({ amount: entry.amount, unit: entry.unit, ...destination }, action);
  }
  function save(change: EntryChange, action: EntryAction) {
    update.mutate(
      { id: entry.id, ...change },
      {
        onSuccess: () => {
          setMoving(false);
          setLastAction(action);
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
            save({ ...portion, date: entry.date, meal: entry.meal }, { kind: "saved" })
          }
        />
      </div>
      {error && !moving && (
        <p role="alert" className="text-12 text-danger">
          {error}
        </p>
      )}
      {lastAction && (
        <ChangeNotice
          action={lastAction}
          pending={pending}
          onUndo={(destination) => move(destination, { kind: "undone" })}
        />
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
          purpose="move"
          pending={pending}
          error={error}
          initial={entry}
          onClose={() => {
            if (!pending) setMoving(false);
          }}
          onChoose={(destination) => {
            if (!pending) move(destination, { kind: "moved", to: destination, from: entry });
          }}
        />
      )}
      <RemoveFood pending={pending} onRemove={() => remove.mutate({ id: entry.id })} />
    </div>
  );
}
