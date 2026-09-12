CREATE TABLE `personal_products` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`request_fingerprint` text NOT NULL,
	`barcode` text,
	`name` text NOT NULL,
	`brand` text,
	`package_quantity` text,
	`serving_size` text,
	`nutrition_basis` text NOT NULL,
	`energy_kcal_100` real NOT NULL,
	`energy_kj_100` real,
	`protein_100` real NOT NULL,
	`carbohydrates_100` real NOT NULL,
	`fat_100` real NOT NULL,
	`saturated_fat_100` real,
	`sugars_100` real,
	`fiber_100` real,
	`salt_100` real,
	`sodium_100` real,
	`search_text` text NOT NULL,
	`sort_name` text NOT NULL,
	`sort_brand` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_personal_products_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `food_entries` ADD `product_source` text DEFAULT 'catalog' NOT NULL;--> statement-breakpoint
ALTER TABLE `food_entries` ADD `personal_product_id` text;--> statement-breakpoint
ALTER TABLE `food_entries` ADD `nutrition_basis` text;--> statement-breakpoint
ALTER TABLE `food_entries` ADD `energy_kj_100g` real;--> statement-breakpoint
ALTER TABLE `food_entries` ADD `saturated_fat_100g` real;--> statement-breakpoint
ALTER TABLE `food_entries` ADD `sugars_100g` real;--> statement-breakpoint
ALTER TABLE `food_entries` ADD `fiber_100g` real;--> statement-breakpoint
ALTER TABLE `food_entries` ADD `salt_100g` real;--> statement-breakpoint
ALTER TABLE `food_entries` ADD `sodium_100g` real;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_food_entries` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`barcode` text,
	`product_source` text DEFAULT 'catalog' NOT NULL,
	`personal_product_id` text,
	`nutrition_basis` text,
	`name` text NOT NULL,
	`brands` text,
	`energy_kcal_100g` real NOT NULL,
	`energy_kj_100g` real,
	`protein_100g` real NOT NULL,
	`carbohydrates_100g` real NOT NULL,
	`fat_100g` real NOT NULL,
	`saturated_fat_100g` real,
	`sugars_100g` real,
	`fiber_100g` real,
	`salt_100g` real,
	`sodium_100g` real,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	`date` text NOT NULL,
	`meal` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_food_entries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_food_entries`(`id`, `user_id`, `barcode`, `name`, `brands`, `energy_kcal_100g`, `protein_100g`, `carbohydrates_100g`, `fat_100g`, `amount`, `unit`, `date`, `meal`, `created_at`) SELECT `id`, `user_id`, `barcode`, `name`, `brands`, `energy_kcal_100g`, `protein_100g`, `carbohydrates_100g`, `fat_100g`, `amount`, `unit`, `date`, `meal`, `created_at` FROM `food_entries`;--> statement-breakpoint
DROP TABLE `food_entries`;--> statement-breakpoint
ALTER TABLE `__new_food_entries` RENAME TO `food_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `food_entries_user_date_idx` ON `food_entries` (`user_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `personal_products_user_request_idx` ON `personal_products` (`user_id`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `personal_products_user_barcode_idx` ON `personal_products` (`user_id`,`barcode`);--> statement-breakpoint
CREATE INDEX `personal_products_browse_idx` ON `personal_products` (`user_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `personal_products_search_idx` ON `personal_products` (`user_id`,`sort_name`,`sort_brand`,`id`);