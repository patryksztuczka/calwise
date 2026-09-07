import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";

/** Smoke test page for the browser → Worker → D1 path; the end-to-end suite runs against it. */
export default function GreetingPage() {
  const trpc = useTRPC();
  const greeting = useQuery({ ...trpc.greeting.current.queryOptions(), retry: 1 });

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <h1 className="font-display text-30 font-bold italic">Hello World</h1>
      {greeting.isPending && (
        <p data-testid="greeting-loading" className="text-muted">
          Loading greeting…
        </p>
      )}
      {greeting.isError && (
        <p data-testid="greeting-error" role="alert" className="text-danger">
          Could not load the greeting: {greeting.error.message}
        </p>
      )}
      {greeting.isSuccess && (
        <p data-testid="greeting" className="text-lg">
          {greeting.data.message}
        </p>
      )}
    </div>
  );
}
