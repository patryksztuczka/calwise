CREATE TABLE `nutrition_goals` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`kcal` integer NOT NULL,
	`mode` text NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	CONSTRAINT `nutrition_goals_pk` PRIMARY KEY(`user_id`, `date`),
	CONSTRAINT `fk_nutrition_goals_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
