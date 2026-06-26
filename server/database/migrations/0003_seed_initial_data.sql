-- Migration: Seed initial admin user and default data
-- This migration creates the first admin user and default products/cylinder stock

-- Admin user (username: admin, password: admin123)
INSERT INTO users (username, password_hash, full_name, role, is_active, created_at)
VALUES ('admin', '234fb77c8305950f3e96a04634373218:38cc0025dad11ec111d09269170478d3ca5ce3c8fba568d240e1e68e3e7a5020', 'Admin User', 'admin', 1, datetime('now'))
ON CONFLICT(username) DO NOTHING;

-- Cylinder stock (must exist before any operations)
INSERT INTO cylinder_stock (size_kg, full_count, empty_count, updated_at)
VALUES
  (12, 0, 0, datetime('now')),
  (17, 0, 0, datetime('now')),
  (33, 0, 0, datetime('now'))
ON CONFLICT(size_kg) DO NOTHING;

-- Default products
INSERT INTO products (name, type, cylinder_size, unit, is_active, created_at)
VALUES
  ('12kg Cylinder', 'cylinder', 12, 'pcs', 1, datetime('now')),
  ('17kg Cylinder', 'cylinder', 17, 'pcs', 1, datetime('now')),
  ('33kg Cylinder', 'cylinder', 33, 'pcs', 1, datetime('now')),
  ('Regulator', 'accessory', NULL, 'pcs', 1, datetime('now')),
  ('Adapter', 'accessory', NULL, 'pcs', 1, datetime('now')),
  ('Connector', 'accessory', NULL, 'pcs', 1, datetime('now')),
  ('Cooktop', 'accessory', NULL, 'pcs', 1, datetime('now'))
ON CONFLICT DO NOTHING;

-- Default prices for cylinders (per unit)
INSERT INTO prices (product_id, customer_id, price, effective_from, created_at)
SELECT id, NULL,
  CASE
    WHEN cylinder_size = 12 THEN 800.00
    WHEN cylinder_size = 17 THEN 1200.00
    WHEN cylinder_size = 33 THEN 2200.00
  END,
  datetime('now'),
  datetime('now')
FROM products
WHERE type = 'cylinder'
  AND NOT EXISTS (
    SELECT 1 FROM prices p
    WHERE p.product_id = products.id
      AND p.customer_id IS NULL
  )
ON CONFLICT DO NOTHING;

-- Default prices for accessories
INSERT INTO prices (product_id, customer_id, price, effective_from, created_at)
SELECT id, NULL, 150.00, datetime('now'), datetime('now')
FROM products
WHERE type = 'accessory'
  AND NOT EXISTS (
    SELECT 1 FROM prices p
    WHERE p.product_id = products.id
      AND p.customer_id IS NULL
  )
ON CONFLICT DO NOTHING;
