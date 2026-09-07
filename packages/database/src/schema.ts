import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const greetings = sqliteTable("greetings", {
  id: integer("id").primaryKey(),
  message: text("message").notNull(),
});
