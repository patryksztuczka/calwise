import { createAuthClient } from "better-auth/react";

// Same-origin during dev/preview (Vite proxies /api/auth); the api origin in production.
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || undefined,
});
