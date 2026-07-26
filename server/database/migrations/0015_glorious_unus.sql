ALTER TABLE `cylinder_stock` ADD `own_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD `empty_new_qty` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD `cylinder_cost` real DEFAULT 0 NOT NULL;