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
