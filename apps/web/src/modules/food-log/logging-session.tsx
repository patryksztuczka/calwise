import { MEAL_NAMES, type Destination } from "@calwise/food-rules/log";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { createContext, useContext, useMemo, useRef, useState } from "react";
import { Link, Outlet } from "react-router";
import { useTRPC } from "../../lib/trpc";
import type { Product, RenderProduct } from "../food/food-types";
import { DestinationControl } from "./destination-picker";
import { mealUrl, useLogDestination } from "./destination";
import type { FoodEntry } from "./food-log-types";
import { PortionEditor } from "./portion-editor";

interface SessionState {
  readonly count: number;
  readonly last: FoodEntry | null;
  readonly added: (entry: FoodEntry) => void;
  readonly undone: (id: string) => void;
}
const SessionContext = createContext<SessionState | null>(null);
function useLoggingSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useLoggingSession requires LoggingSession");
  return session;
}
export function LoggingSession() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const value = useMemo<SessionState>(
    () => ({
      count: entries.length,
      last: entries.at(-1) ?? null,
      added: (entry) =>
        setEntries((old) => (old.some((item) => item.id === entry.id) ? old : [...old, entry])),
      undone: (id) => setEntries((old) => old.filter((entry) => entry.id !== id)),
    }),
    [entries],
  );
  return (
    <SessionContext.Provider value={value}>
      <Outlet />
    </SessionContext.Provider>
  );
}

export const renderAddFoodForm: RenderProduct = (product, done) => (
  <AddFoodForm product={product} onAdded={done} />
);

function AddFoodForm({
  product,
  onAdded,
}: {
  readonly product: Product;
  readonly onAdded?: () => void;
}) {
  const destination = useLogDestination();
  if (!destination.meal)
    return (
      <>
        <p className="text-12 text-muted">Choose a meal before adding food.</p>
        <DestinationControl destination={destination} onChoose={destination.setDestination} />
      </>
    );
  return (
    <AddToMeal
      product={product}
      destination={{ date: destination.date, meal: destination.meal }}
      onAdded={onAdded}
    />
  );
}

function AddToMeal({
  product,
  destination,
  onAdded,
}: {
  readonly product: Product;
  readonly destination: Destination;
  readonly onAdded?: (() => void) | undefined;
}) {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const session = useLoggingSession();
  const requestId = useRef(crypto.randomUUID());
  const add = useMutation({
    ...trpc.foodLog.add.mutationOptions(),
    onSuccess: (entry) => {
      session.added(entry);
      requestId.current = crypto.randomUUID();
      void cache.invalidateQueries(trpc.foodLog.pathFilter());
      onAdded?.();
    },
  });
  return (
    <PortionEditor
      basis={product}
      label={`ADD TO ${MEAL_NAMES[destination.meal].toUpperCase()}`}
      pending={add.isPending}
      error={add.isError ? "Could not add food. Check your connection and try again." : undefined}
      onSave={(portion) =>
        add.mutate({
          id: requestId.current,
          barcode: product.barcode,
          ...destination,
          ...portion,
        })
      }
    />
  );
}

export function LoggingFooter() {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const session = useLoggingSession();
  const destination = useLogDestination();
  const remove = useMutation(
    trpc.foodLog.remove.mutationOptions({
      onSuccess: (_result, input) => {
        session.undone(input.id);
        void cache.invalidateQueries(trpc.foodLog.pathFilter());
      },
    }),
  );
  return (
    <div className="sticky bottom-0 mt-auto flex flex-col gap-3 bg-bg py-4">
      {session.last && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-12 border border-lime/30 bg-lime/10 p-3"
        >
          <CircleCheck size={20} className="shrink-0 text-lime" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-12">{session.last.name} added</p>
            <p className="text-10 text-muted">
              {session.last.amount} {session.last.unit} · {MEAL_NAMES[session.last.meal]}
            </p>
          </div>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => {
              if (session.last) remove.mutate({ id: session.last.id });
            }}
            className="min-h-11 text-12 text-lime"
          >
            Undo
          </button>
        </div>
      )}
      {remove.isError && (
        <p role="alert" className="text-12 text-danger">
          Could not undo. Try again.
        </p>
      )}
      <Link
        to={
          destination.meal
            ? mealUrl({ date: destination.date, meal: destination.meal })
            : `/?date=${destination.date}`
        }
        className="flex min-h-12 items-center justify-center rounded-10 border border-line bg-surface text-11 font-semibold tracking-[1px]"
      >
        DONE · {session.count} FOODS ADDED
      </Link>
    </div>
  );
}
