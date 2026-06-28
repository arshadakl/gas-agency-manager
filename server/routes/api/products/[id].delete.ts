import { eq, and } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { products, deliveryItems, purchaseItems, inventory, cylinderStock } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])
  const productId = parseInt(getRouterParam(event, 'id') || '0')

  if (!productId) throw createError({ statusCode: 400, message: 'Invalid product ID' })

  const db = useDB(event)

  // Check if product exists
  const product = await db.select()
    .from(products)
    .where(eq(products.id, productId))
    .get()

  if (!product) throw createError({ statusCode: 404, message: 'Product not found' })

  // Check if product appears in any deliveries
  const deliveryCount = await db.select({ count: 'count' })
    .from(deliveryItems)
    .where(eq(deliveryItems.productId, productId))
    .get()

  if (deliveryCount && Number(deliveryCount.count) > 0) {
    throw createError({
      statusCode: 409,
      message: `Cannot delete. This product has ${deliveryCount.count} delivery records. History must be preserved.`,
    })
  }

  // Check if product appears in any purchases
  const purchaseCount = await db.select({ count: 'count' })
    .from(purchaseItems)
    .where(eq(purchaseItems.productId, productId))
    .get()

  if (purchaseCount && Number(purchaseCount.count) > 0) {
    throw createError({
      statusCode: 409,
      message: `Cannot delete. This product has ${purchaseCount.count} purchase records. History must be preserved.`,
    })
  }

  // For cylinders, check cylinder stock
  if (product.type === 'cylinder' && product.cylinderSize) {
    const stock = await db.select()
      .from(cylinderStock)
      .where(eq(cylinderStock.sizeKg, product.cylinderSize))
      .get()

    if (stock && (stock.fullCount > 0 || stock.emptyCount > 0)) {
      throw createError({
        statusCode: 409,
        message: `Cannot delete. Stock available: ${stock.fullCount} full, ${stock.emptyCount} empty. Clear stock first.`,
      })
    }
  }

  // For accessories, check inventory
  if (product.type === 'accessory') {
    const inv = await db.select()
      .from(inventory)
      .where(eq(inventory.productId, productId))
      .get()

    if (inv && inv.quantity > 0) {
      throw createError({
        statusCode: 409,
        message: `Cannot delete. Inventory stock: ${inv.quantity} units. Clear stock first.`,
      })
    }
  }

  // Soft delete — set is_active to 0
  await db.update(products)
    .set({ isActive: 0 })
    .where(eq(products.id, productId))

  return { data: { message: 'Product deactivated' } }
})
