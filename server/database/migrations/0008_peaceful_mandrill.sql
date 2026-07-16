ALTER TABLE `customers` ADD `promised_pay_date` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `promised_pay_note` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `connection_deposit` real;--> statement-breakpoint
ALTER TABLE `customers` ADD `deposit_note` text;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD `new_connection_qty` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `purchases` ADD `connection_charge` real DEFAULT 0 NOT NULL;