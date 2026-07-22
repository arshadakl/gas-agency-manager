import { z } from 'zod'
import { useDB } from '~/server/database'
import { customers } from '~/server/database/schema'
import { phoneSchema } from '~/utils/validators'
import { generateId } from '~/server/utils/id'

// Bulk onboarding import — brings the client's existing notebook data in as
// customer rows with opening balances (and optional deposits). Snapshot data
// only: no historical deliveries/payments are imported (CLAUDE.md plan).
const ImportRowSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  contactPerson: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  openingBalance: z.number().min(0).default(0),
  connectionDeposit: z.number().min(0).optional(),
})

const ImportSchema = z.object({
  rows: z.array(ImportRowSchema).min(1).max(1000),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const body = await parseBody(event, ImportSchema)
  const db = useDB(event)

  const existing = await db.select({ phone: customers.phone }).from(customers).all()
  const seenPhones = new Set(existing.map((c) => c.phone))

  const toInsert: Array<typeof body.rows[number]> = []
  const skipped: Array<{ name: string; phone: string; reason: string }> = []

  for (const row of body.rows) {
    if (seenPhones.has(row.phone)) {
      skipped.push({ name: row.name, phone: row.phone, reason: 'Phone number already exists' })
      continue
    }
    seenPhones.add(row.phone)
    toInsert.push(row)
  }

  // D1 has no transactions (CLAUDE.md §23.4) — insert in chunks via db.batch()
  // so one bad chunk can't leave more than 50 rows in limbo.
  const CHUNK = 50
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK)
    const statements = chunk.map((row) => db.insert(customers).values({
      publicId: generateId(),
      name: row.name,
      phone: row.phone,
      contactPerson: row.contactPerson ?? null,
      area: row.area ?? null,
      openingBalance: row.openingBalance,
      connectionDeposit: row.connectionDeposit ?? null,
    }))
    await db.batch(statements as [typeof statements[number], ...typeof statements])
    inserted += chunk.length
  }

  return { data: { inserted, skipped, total: body.rows.length } }
})
