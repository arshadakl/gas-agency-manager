-- Add features_disabled column to users for UI-level RBAC
-- null or '[]' = full access (all features visible)
-- JSON array of disabled feature keys, e.g. '["super_gas_accounts","profit_loss"]'
ALTER TABLE users ADD COLUMN features_disabled text;
