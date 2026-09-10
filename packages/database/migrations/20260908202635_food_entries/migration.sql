CREATE TABLE `food_entries` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`barcode` text NOT NULL,
	`name` text NOT NULL,
	`brands` text,
	`energy_kcal_100g` real NOT NULL,
	`protein_100g` real NOT NULL,
	`carbohydrates_100g` real NOT NULL,
	`fat_100g` real NOT NULL,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	`date` text NOT NULL,
	`meal` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_food_entries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `food_entries_user_date_idx` ON `food_entries` (`user_id`,`date`);