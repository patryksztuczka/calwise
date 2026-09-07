import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barcode: text("barcode").notNull().unique(),
  name: text("name").notNull(),
  brands: text("brands"),
  searchName: text("search_name").notNull(),
  searchBrands: text("search_brands").notNull(),
  packageQuantity: text("package_quantity"),
  servingSize: text("serving_size"),
  energyKcal100g: real("energy_kcal_100g").notNull(),
  energyKj100g: real("energy_kj_100g"),
  fat100g: real("fat_100g").notNull(),
  saturatedFat100g: real("saturated_fat_100g"),
  carbohydrates100g: real("carbohydrates_100g").notNull(),
  sugars100g: real("sugars_100g"),
  fiber100g: real("fiber_100g"),
  protein100g: real("protein_100g").notNull(),
  salt100g: real("salt_100g"),
  sodium100g: real("sodium_100g"),
  countries: text("countries", { mode: "json" }).$type<string[]>().notNull(),
  categories: text("categories", { mode: "json" }).$type<string[]>().notNull(),
  allergens: text("allergens", { mode: "json" }).$type<string[]>().notNull(),
  traces: text("traces", { mode: "json" }).$type<string[]>().notNull(),
  dataQualityErrors: text("data_quality_errors", { mode: "json" }).$type<string[]>().notNull(),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  sourceUrl: text("source_url").notNull(),
  sourceModifiedAt: integer("source_modified_at").notNull(),
});

export type Product = typeof products.$inferSelect;
