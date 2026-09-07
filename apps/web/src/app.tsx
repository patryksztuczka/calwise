import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "./lib/trpc";

export default function App() {
  const trpc = useTRPC();
  const greeting = useQuery(trpc.greeting.queryOptions());

  return (
    <main className="mx-auto max-w-xl p-8">
      <p className="mb-4 text-sm text-gray-500">Calwise</p>
      {greeting.isPending ? (
        <p role="status">Connecting...</p>
      ) : greeting.isError ? (
        <p role="alert">Couldn't connect to the API. Please try again later.</p>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">{greeting.data.message}</h1>
          <p className="mt-2">Connected to Cloudflare {greeting.data.database}</p>
        </>
      )}
    </main>
  );
}
