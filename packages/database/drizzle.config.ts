import { defineConfig } from "drizzle-kit";

// Only `drizzle-kit generate` runs against this config. Migrations are applied
// by wrangler (`wrangler d1 migrations apply`), which discovers the generated
// `migrations/*/migration.sql` files through `migrations_pattern` in
// apps/api/wrangler.jsonc.
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
});
