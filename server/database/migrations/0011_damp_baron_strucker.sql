ALTER TABLE `expenses` ADD `public_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_public_id_unique` ON `expenses` (`public_id`);--> statement-breakpoint
ALTER TABLE `orders` ADD `public_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_public_id_unique` ON `orders` (`public_id`);--> statement-breakpoint
ALTER TABLE `products` ADD `public_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `products_public_id_unique` ON `products` (`public_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `public_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_public_id_unique` ON `users` (`public_id`);--> statement-breakpoint
-- Backfill existing rows with random publicIds
UPDATE `products` SET `public_id` = lower(hex(randomblob(8))) WHERE `public_id` IS NULL;--> statement-breakpoint
UPDATE `orders` SET `public_id` = lower(hex(randomblob(8))) WHERE `public_id` IS NULL;--> statement-breakpoint
UPDATE `users` SET `public_id` = lower(hex(randomblob(8))) WHERE `public_id` IS NULL;--> statement-breakpoint
UPDATE `expenses` SET `public_id` = lower(hex(randomblob(8))) WHERE `public_id` IS NULL;