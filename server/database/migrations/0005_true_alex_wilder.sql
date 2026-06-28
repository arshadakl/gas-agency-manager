ALTER TABLE `customers` ADD `public_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `customers_public_id_unique` ON `customers` (`public_id`);--> statement-breakpoint
ALTER TABLE `deliveries` ADD `public_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `deliveries_public_id_unique` ON `deliveries` (`public_id`);--> statement-breakpoint
ALTER TABLE `purchases` ADD `public_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_public_id_unique` ON `purchases` (`public_id`);
