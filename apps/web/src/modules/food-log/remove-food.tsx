import { useState } from "react";

export function RemoveFood({
  pending,
  onRemove,
}: {
  readonly pending: boolean;
  readonly onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <fieldset disabled={pending} className="mt-auto pt-8">
      {confirming ? (
        <div className="flex flex-col gap-3">
          <p className="text-13">Remove this food entry?</p>
          <div className="flex gap-6">
            <button type="button" onClick={onRemove} className="min-h-11 text-12 text-danger">
              Confirm removal
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-11 text-12">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-11 text-12 text-danger"
        >
          Remove food
        </button>
      )}
    </fieldset>
  );
}
