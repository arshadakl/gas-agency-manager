ALTER TABLE `expenses` ADD `payment_source` text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
CREATE INDEX `expenses_source_idx` ON `expenses` (`payment_source`);