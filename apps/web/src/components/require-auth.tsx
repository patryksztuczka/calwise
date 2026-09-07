import { Navigate, Outlet } from "react-router";
import { authClient } from "../lib/auth-client";

/** Renders child routes only for a signed-in user; anonymous visitors go to sign-in. */
export function RequireAuth() {
  const session = authClient.useSession();
  if (session.isPending) return null;
  if (session.data === null) {
    return <Navigate to="/sign-in" replace />;
  }
  return <Outlet />;
}
