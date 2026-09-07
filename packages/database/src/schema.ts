import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const greetings = sqliteTable("greetings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  message: text("message").notNull(),
});

export type Greeting = typeof greetings.$inferSelect;
export type NewGreeting = typeof greetings.$inferInsert;

/*
 * Better Auth tables (`usePlural: true` on the drizzle adapter). The column set
 * is what `@better-auth/cli generate` produces for the email + password flow;
 * keep the shape in step with the adapter when Better Auth is upgraded.
 */

const createdNow = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(createdNow).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(createdNow)
    .$onUpdate(() => new Date())
    .notNull(),
});

export type User = typeof users.$inferSelect;

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(createdNow).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export type Session = typeof sessions.$inferSelect;

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(createdNow).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(createdNow).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(createdNow)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);
