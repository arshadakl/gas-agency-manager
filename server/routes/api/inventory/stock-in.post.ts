import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { inventory, products } from '~/server/database/schema'

const StockInSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const body = await parseBody(event, StockInSchema)
  const db = useDB(event)

  const product = await db.select().from(products).where(eq(products.id, body.productId)).get()
  if (!product) throw createError({ statusCode: 404, message: 'Product not found' })
  if (!product.isActive) throw createError({ statusCode: 422, message: 'Cannot stock deactivated product' })
  // Cylinders are tracked in cylinder_stock via the Purchase module (§23/§24) —
  // never the generic inventory table, or the two would silently disagree.
  if (product.type === 'cylinder') {
    throw createError({ statusCode: 422, message: 'Cylinders are stocked via Purchases, not this endpoint' })
  }

  const [updated] = await db.insert(inventory)
    .values({ productId: body.productId, quantity: body.quantity })
    .onConflictDoUpdate({
      target: inventory.productId,
      set: { quantity: sql`${inventory.quantity} + ${body.quantity}` },
    })
    .returning()
  if (!updated) throw createError({ statusCode: 500, message: 'Failed to update stock' })

  return { data: updated }
})
