import { LOGGED_UNITS, MEAL_SLOTS } from "@calwise/food-rules/log";
import { NUTRITION_BASES } from "@calwise/food-rules/personal-product";
import { getTableColumns, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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

export const nutritionGoals = sqliteTable(
  "nutrition_goals",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    kcal: integer("kcal").notNull(),
    mode: text("mode", { enum: ["percentages", "grams"] }).notNull(),
    protein: real("protein").notNull(),
    carbs: real("carbs").notNull(),
    fat: real("fat").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })],
);

export const personalProducts = sqliteTable(
  "personal_products",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestId: text("request_id").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    barcode: text("barcode"),
    name: text("name").notNull(),
    brand: text("brand"),
    packageQuantity: text("package_quantity"),
    servingSize: text("serving_size"),
    nutritionBasis: text("nutrition_basis", { enum: NUTRITION_BASES }).notNull(),
    energyKcal100: real("energy_kcal_100").notNull(),
    energyKj100: real("energy_kj_100"),
    protein100: real("protein_100").notNull(),
    carbohydrates100: real("carbohydrates_100").notNull(),
    fat100: real("fat_100").notNull(),
    saturatedFat100: real("saturated_fat_100"),
    sugars100: real("sugars_100"),
    fiber100: real("fiber_100"),
    salt100: real("salt_100"),
    sodium100: real("sodium_100"),
    searchText: text("search_text").notNull(),
    sortName: text("sort_name").notNull(),
    sortBrand: text("sort_brand").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("personal_products_user_request_idx").on(table.userId, table.requestId),
    uniqueIndex("personal_products_user_barcode_idx").on(table.userId, table.barcode),
    index("personal_products_browse_idx").on(table.userId, table.createdAt, table.id),
    index("personal_products_search_idx").on(
      table.userId,
      table.sortName,
      table.sortBrand,
      table.id,
    ),
  ],
);

export type PersonalProductRow = typeof personalProducts.$inferSelect;
const {
  userId: _personalProductUserId,
  requestId: _personalProductRequestId,
  requestFingerprint: _personalProductFingerprint,
  searchText: _personalProductSearchText,
  sortName: _personalProductSortName,
  sortBrand: _personalProductSortBrand,
  ...publicPersonalProductColumns
} = getTableColumns(personalProducts);
export { publicPersonalProductColumns };

export const foodEntries = sqliteTable(
  "food_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    barcode: text("barcode"),
    productSource: text("product_source", { enum: ["catalog", "personal"] })
      .default("catalog")
      .notNull(),
    personalProductId: text("personal_product_id"),
    nutritionBasis: text("nutrition_basis", { enum: NUTRITION_BASES }),
    name: text("name").notNull(),
    brands: text("brands"),
    energyKcal100g: real("energy_kcal_100g").notNull(),
    energyKj100g: real("energy_kj_100g"),
    protein100g: real("protein_100g").notNull(),
    carbohydrates100g: real("carbohydrates_100g").notNull(),
    fat100g: real("fat_100g").notNull(),
    saturatedFat100g: real("saturated_fat_100g"),
    sugars100g: real("sugars_100g"),
    fiber100g: real("fiber_100g"),
    salt100g: real("salt_100g"),
    sodium100g: real("sodium_100g"),
    amount: real("amount").notNull(),
    unit: text("unit", { enum: LOGGED_UNITS }).notNull(),
    date: text("date").notNull(),
    meal: text("meal", { enum: MEAL_SLOTS }).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("food_entries_user_date_idx").on(table.userId, table.date)],
);

export type FoodEntry = typeof foodEntries.$inferSelect;
const { userId: _userId, ...publicFoodEntryColumns } = getTableColumns(foodEntries);
export { publicFoodEntryColumns };

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
