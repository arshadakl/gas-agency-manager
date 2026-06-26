INSERT INTO users (username, password_hash, full_name, role, is_active)
VALUES ('admin', '234fb77c8305950f3e96a04634373218:38cc0025dad11ec111d09269170478d3ca5ce3c8fba568d240e1e68e3e7a5020', 'Admin User', 'admin', 1);

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
