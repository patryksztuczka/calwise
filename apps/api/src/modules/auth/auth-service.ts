import { schema } from "@calwise/database";
import type { D1Database } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { Context } from "effect";
import { isAllowedOrigin } from "../../http/origins.ts";

export interface AuthOptions {
  /** Signs session cookies. The Worker reads it from the `BETTER_AUTH_SECRET` secret. */
  readonly secret: string;
  /** The D1 binding. Omit to keep users in memory (unit tests). */
  readonly database?: D1Database;
}

/**
 * Email + password only, no verification step: an account is usable right after sign-up.
 * Better Auth owns the `users`, `sessions`, `accounts` and `verifications` tables in the schema.
 */
const createAuth = ({ secret, database }: AuthOptions) =>
  betterAuth({
    secret,
    database:
      database === undefined
        ? undefined
        : drizzleAdapter(drizzle(database), { provider: "sqlite", usePlural: true, schema }),
    emailAndPassword: { enabled: true },
    trustedOrigins: (request) => {
      const origin = request?.headers.get("origin");
      return origin !== null && origin !== undefined && isAllowedOrigin(origin) ? [origin] : [];
    },
  });

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];

/**
 * The Better Auth instance as an Effect service. The live layer lives in `auth-live.ts`
 * because it reads the Cloudflare env; this module stays importable from Node for tests.
 */
export class AuthService extends Context.Service<AuthService, Auth>()("@calwise/AuthService") {
  static readonly make = createAuth;
}
