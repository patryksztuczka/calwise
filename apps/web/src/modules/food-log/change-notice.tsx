import { MEAL_NAMES, type Destination } from "@calwise/food-rules/log";

/** The last successful change to an entry, shown until the next one replaces it. */
export type EntryAction =
  | { readonly kind: "saved" }
  | {
      readonly kind: "moved";
      readonly to: Destination;
      readonly from: Destination;
    }
  | { readonly kind: "undone" };

function describe(action: EntryAction): string {
  switch (action.kind) {
    case "saved":
      return "Changes saved";
    case "moved":
      return `Moved to ${MEAL_NAMES[action.to.meal]} · ${action.to.date}`;
    case "undone":
      return "Move undone";
  }
}

export function ChangeNotice({
  action,
  pending,
  onUndo,
}: {
  readonly action: EntryAction;
  readonly pending: boolean;
  readonly onUndo: (destination: Destination) => void;
}) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-12 border border-lime/30 bg-lime/10 p-3 text-12"
    >
      <span>{describe(action)}</span>
      {action.kind === "moved" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => onUndo(action.from)}
          className="min-h-11 text-lime"
        >
          Undo
        </button>
      )}
    </div>
  );
}
