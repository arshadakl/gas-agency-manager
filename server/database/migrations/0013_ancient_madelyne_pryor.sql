CREATE TABLE `account_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_type` text NOT NULL,
	`amount` real NOT NULL,
	`transaction_type` text NOT NULL,
	`reference_id` integer,
	`reference_type` text,
	`notes` text,
	`created_by` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_transactions_account_idx` ON `account_transactions` (`account_type`);--> statement-breakpoint
CREATE INDEX `account_transactions_type_idx` ON `account_transactions` (`transaction_type`);--> statement-breakpoint
CREATE INDEX `account_transactions_date_idx` ON `account_transactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_type_unique` ON `accounts` (`type`);
--> statement-breakpoint
INSERT INTO `accounts` (`type`, `balance`) VALUES ('cash', 0), ('bank', 0);