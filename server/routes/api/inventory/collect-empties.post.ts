import { z } from 'zod'
import { useDB } from '~/server/database'
import { cylinderSizeSchema } from '~/utils/validators'
import { applyStockChanges } from '~/server/utils/stock'

const CollectEmptiesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    sizeKg: cylinderSizeSchema,
    qty: z.number().int().positive(),
  })).min(1),
  notes: z.string().max(500).optional(),
  customerName: z.string().max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, CollectEmptiesSchema)
  const db = useDB(event)

  const changes = body.items.map((i) => ({
    sizeKg: i.sizeKg,
    fullChange: 0,
    emptyChange: i.qty,
  }))

  const noteText = [
    body.notes,
    body.customerName ? `Customer: ${body.customerName}` : undefined,
    `Date: ${body.date}`,
  ].filter(Boolean).join(' | ')

  await applyStockChanges(db, changes, 'adjustment', null, 'collect_empties', user, noteText)

  return { data: { message: 'Empty cylinders recorded', items: body.items } }
})
