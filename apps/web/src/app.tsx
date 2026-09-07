import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "./lib/trpc";

export default function App() {
  const trpc = useTRPC();
  const greeting = useQuery({ ...trpc.greeting.current.queryOptions(), retry: 1 });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">Hello World</h1>
      {greeting.isPending && (
        <p data-testid="greeting-loading" className="text-neutral-500">
          Loading greeting…
        </p>
      )}
      {greeting.isError && (
        <p data-testid="greeting-error" role="alert" className="text-red-700">
          Could not load the greeting: {greeting.error.message}
        </p>
      )}
      {greeting.isSuccess && (
        <p data-testid="greeting" className="text-lg">
          {greeting.data.message}
        </p>
      )}
    </main>
  );
}
