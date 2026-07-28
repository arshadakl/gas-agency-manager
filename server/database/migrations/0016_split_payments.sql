-- Create purchase_payments table for split payment tracking
CREATE TABLE `purchase_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer NOT NULL,
	`amount` real NOT NULL,
	`payment_mode` text NOT NULL,
	`notes` text,
	`created_by` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `purchase_payments_purchase_idx` ON `purchase_payments` (`purchase_id`);--> statement-breakpoint
-- Backfill existing payment data into purchase_payments
INSERT INTO `purchase_payments` (`purchase_id`, `amount`, `payment_mode`, `created_by`, `created_by_name`, `created_at`)
SELECT `id`, `amount_paid`, COALESCE(`payment_mode`, 'cash'), `created_by`, `created_by_name`, `created_at`
FROM `purchases`
WHERE `amount_paid` > 0 AND `payment_mode` IN ('cash', 'bank');--> statement-breakpoint
-- Drop paymentMode column from purchases (no longer needed — payments tracked in purchase_payments)
ALTER TABLE `purchases` DROP COLUMN `payment_mode`;--> statement-breakpoint
