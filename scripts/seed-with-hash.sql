INSERT INTO users (username, password_hash, full_name, role, is_active)
VALUES ('admin', '02d98c5e319e5e97d5dd0936865d6c30:1f7d36e12373f882a2a038f460db393fd898e79e98a2995818a1817f55f6131c', 'Admin User', 'admin', 1);

INSERT INTO cylinder_stock (size_kg, full_count, empty_count) VALUES
  (12, 0, 0),
  (17, 0, 0),
  (33, 0, 0);

INSERT INTO products (name, type, cylinder_size, unit, is_active) VALUES
  ('12kg Cylinder', 'cylinder', 12, 'pcs', 1),
  ('17kg Cylinder', 'cylinder', 17, 'pcs', 1),
  ('33kg Cylinder', 'cylinder', 33, 'pcs', 1),
  ('Regulator', 'accessory', NULL, 'pcs', 1),
  ('Adapter', 'accessory', NULL, 'pcs', 1),
  ('Connector', 'accessory', NULL, 'pcs', 1),
  ('Cooktop', 'accessory', NULL, 'pcs', 1);