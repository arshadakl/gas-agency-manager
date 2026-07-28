-- Add customer type column (restaurant / home)
ALTER TABLE customers ADD COLUMN type TEXT NOT NULL DEFAULT 'restaurant';
