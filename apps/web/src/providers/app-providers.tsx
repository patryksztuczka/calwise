import type { AppRouter } from "@calwise/api/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { useState, type ReactNode } from "react";
import { BrowserRouter } from "react-router";
import { TRPCProvider } from "../lib/trpc";

const apiUrl = `${import.meta.env.VITE_API_URL ?? ""}/trpc`;

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: apiUrl,
          // The session cookie is issued by the api origin, so cross-origin calls must carry it.
          fetch: (input, init) =>
            fetch(input, { ...init, signal: init?.signal ?? null, credentials: "include" }),
        }),
      ],
    }),
  );

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          {children}
        </TRPCProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
