import { useDB } from '~/server/database'
import { StockAdjustmentSchema } from '~/utils/validators'
import { applyStockChanges } from '~/server/utils/stock'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, StockAdjustmentSchema)
  const db = useDB(event)

  await applyStockChanges(
    db,
    [{ sizeKg: body.sizeKg, fullChange: body.fullChange, emptyChange: body.emptyChange }],
    'adjustment',
    null,
    'manual',
    user,
    body.notes,
  )

  return { data: null, message: 'Stock adjusted' }
})
