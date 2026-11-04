-- Index staff_id on expenses (matches schema.ts)
CREATE INDEX IF NOT EXISTS `expenses_staff_idx` ON `expenses` (`staff_id`);

-- Index reference lookups on account_transactions (reversals and audits)
CREATE INDEX IF NOT EXISTS `account_transactions_ref_idx` ON `account_transactions` (`reference_type`, `reference_id`);

-- Index phone on customers (instant lookup during delivery and order entry)
CREATE INDEX IF NOT EXISTS `customers_phone_idx` ON `customers` (`phone`);

-- Composite index on deliveries for FIFO payment settlement
CREATE INDEX IF NOT EXISTS `deliveries_cust_pay_idx` ON `deliveries` (`customer_id`, `payment_status`);
