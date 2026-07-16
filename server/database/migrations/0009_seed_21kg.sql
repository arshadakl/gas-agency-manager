-- Migration: Add 21kg cylinder size (client confirmed 4 sizes: 12, 17, 21, 33)

-- Stock row must exist before any 21kg operation (validateStockChanges throws 500 otherwise)
INSERT INTO cylinder_stock (size_kg, full_count, empty_count, updated_at)
VALUES (21, 0, 0, datetime('now'))
ON CONFLICT(size_kg) DO NOTHING;

-- 21kg cylinder product
INSERT INTO products (name, type, cylinder_size, unit, is_active, created_at)
SELECT '21kg Cylinder', 'cylinder', 21, 'pcs', 1, datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE type = 'cylinder' AND cylinder_size = 21
);
