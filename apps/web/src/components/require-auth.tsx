import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Navigate, Outlet } from "react-router";
import { authClient } from "../lib/auth-client";
import { TRPCProvider, useTRPCClient } from "../lib/trpc";

/** Renders child routes only for a signed-in user; anonymous visitors go to sign-in. */
export function RequireAuth() {
  const session = authClient.useSession();
  if (session.isPending) return null;
  if (session.data === null) {
    return <Navigate to="/sign-in" replace />;
  }
  return (
    <OwnerQueryScope key={session.data.user.id}>
      <Outlet />
    </OwnerQueryScope>
  );
}

/** A late response can only write to the query client belonging to the owner who started it. */
function OwnerQueryScope({ children }: { readonly children: ReactNode }) {
  const trpcClient = useTRPCClient();
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
