-- Add staff_id and staff_name to expenses table for Salary category
ALTER TABLE expenses ADD COLUMN staff_id integer REFERENCES users(id);
ALTER TABLE expenses ADD COLUMN staff_name text;

-- Safe historical backfill: migrate existing salary_withdrawal transactions into expenses
INSERT INTO expenses (public_id, expense_date, amount, tag, payment_source, notes, staff_name, created_by, created_by_name, created_at)
SELECT 
  'exp_' || lower(hex(randomblob(8))),
  substr(created_at, 1, 10),
  abs(amount),
  'salary',
  account_type,
  notes,
  salary_for_name,
  created_by,
  created_by_name,
  created_at
FROM account_transactions
WHERE transaction_type = 'salary_withdrawal'
  AND (reference_type IS NULL OR reference_type != 'expense');

-- Link historical account_transactions to the newly created expenses
UPDATE account_transactions
SET reference_type = 'expense',
    reference_id = (
      SELECT e.id FROM expenses e 
      WHERE e.tag = 'salary'
        AND e.amount = abs(account_transactions.amount)
        AND e.created_at = account_transactions.created_at
      LIMIT 1
    )
WHERE transaction_type = 'salary_withdrawal'
  AND (reference_type IS NULL OR reference_type != 'expense');
