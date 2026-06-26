import { execSync } from 'child_process'
import { resolve } from 'path'

const ITERATIONS = 100_000
const KEY_LENGTH_BITS = 256
const SALT_LENGTH = 16

function toHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function deriveBits(password, salt) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH_BITS,
  )
  return new Uint8Array(bits)
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const derived = await deriveBits(password, salt)
  return `${toHex(salt)}:${toHex(derived)}`
}

const password = 'admin123'
console.log('Hashing default admin password...')
const hashedPassword = await hashPassword(password)

console.log('Creating SQL file...')
const fs = await import('fs/promises')
const sqlPath = resolve('scripts/seed-with-hash.sql')
const sqlContent = `INSERT INTO users (username, password_hash, full_name, role, is_active)
VALUES ('admin', '${hashedPassword}', 'Admin User', 'admin', 1);

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
  ('Cooktop', 'accessory', NULL, 'pcs', 1);`

await fs.writeFile(sqlPath, sqlContent)

console.log('\nInserting admin user into local D1...')
try {
  execSync(`npx wrangler d1 execute DB --local --file="${sqlPath}"`, { stdio: 'inherit' })
  console.log('\n✅ Seed data inserted successfully')
  console.log(`\nLogin with:\n  username: admin\n  password: ${password}`)
} catch (err) {
  console.error('❌ Failed to seed database:', err.message)
}
