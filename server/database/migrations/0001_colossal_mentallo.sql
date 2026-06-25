CREATE TABLE `cylinder_stock` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`size_kg` integer NOT NULL,
	`full_count` integer DEFAULT 0 NOT NULL,
	`empty_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cylinder_stock_size_kg_unique` ON `cylinder_stock` (`size_kg`);--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer NOT NULL,
	`size_kg` integer NOT NULL,
	`received_qty` integer DEFAULT 0 NOT NULL,
	`returned_qty` integer DEFAULT 0 NOT NULL,
	`unit_price` real,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `purchase_items_purchase_idx` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier` text NOT NULL,
	`purchase_date` text NOT NULL,
	`invoice_no` text,
	`total_amount` real NOT NULL,
	`amount_paid` real DEFAULT 0 NOT NULL,
	`payment_mode` text,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`payment_reference` text,
	`due_date` text,
	`notes` text,
	`created_by` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `purchases_date_idx` ON `purchases` (`purchase_date`);--> statement-breakpoint
CREATE INDEX `purchases_status_idx` ON `purchases` (`payment_status`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`size_kg` integer NOT NULL,
	`movement_type` text NOT NULL,
	`full_change` integer NOT NULL,
	`empty_change` integer NOT NULL,
	`reference_id` integer,
	`reference_type` text,
	`notes` text,
	`created_by` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_movements_size_idx` ON `stock_movements` (`size_kg`);--> statement-breakpoint
CREATE INDEX `stock_movements_type_idx` ON `stock_movements` (`movement_type`);--> statement-breakpoint
CREATE INDEX `stock_movements_ref_idx` ON `stock_movements` (`reference_id`,`reference_type`);--> statement-breakpoint
ALTER TABLE `customers` ADD `contact_person` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `area` text;