import { eq, inArray, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems, inventory, products, customers, expenses } from '~/server/database/schema'
import { DeliverySchema } from '~/utils/validators'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import { recordCustomerPayment } from '~/server/utils/payment'
import { generateId } from '~/server/utils/id'
import { recordAccountTransaction } from '~/server/utils/account'
import type { CylinderSize } from '~/types'
import type { AccountType } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, DeliverySchema)
  const db = useDB(event)

  const customer = await db.select({ id: customers.id, isActive: customers.isActive }).from(customers).where(eq(customers.id, body.customerId)).get()
  if (!customer) throw createError({ statusCode: 404, message: 'Customer not found' })
  if (customer.isActive === 0) throw createError({ statusCode: 403, message: 'Customer is archived' })

  const productRows = await db.select().from(products)
    .where(inArray(products.id, body.items.map((i) => i.productId)))
    .all()
  const productById = new Map(productRows.map((p) => [p.id, p]))

  const cylinderTotals = new Map<CylinderSize, number>()
  for (const item of body.items) {
    const product = productById.get(item.productId)
    if (product?.type !== 'cylinder' || !product.cylinderSize) continue
    const size = product.cylinderSize as CylinderSize
    cylinderTotals.set(size, (cylinderTotals.get(size) ?? 0) + item.quantity)
  }
  const cylinderChanges = Array.from(cylinderTotals.entries()).map(([sizeKg, qty]) => ({
    sizeKg,
    fullChange: -qty,
    emptyChange: qty,
  }))

  // Validate before any write — D1 has no rollback, so a failure here must
  // never leave an orphaned delivery record (see CLAUDE.md §23.4 D1 note).
  if (cylinderChanges.length > 0) await validateStockChanges(db, cylinderChanges)

  const isFreeDelivery = body.freeAccessories && body.freeAccessories.length > 0

  const [delivery] = await db.insert(deliveries).values({
    publicId: generateId(),
    customerId: body.customerId,
    deliveryDate: body.deliveryDate,
    status: 'delivered',
    paymentStatus: isFreeDelivery ? 'paid' : 'pending',
    totalAmount: body.totalAmount,
    notes: body.notes,
    createdBy: user.id,
    createdByName: user.fullName,
  }).returning()

  if (!delivery) throw createError({ statusCode: 500, message: 'Failed to create delivery' })

  const accessoryItems = body.items.filter((i) => productById.get(i.productId)?.type !== 'cylinder')

  const batchQueries = [
    ...body.items.map((item) =>
      db.insert(deliveryItems).values({
        deliveryId: delivery.id,
        productId: item.productId,
        quantity: item.quantity,
      })
    ),
    ...accessoryItems.map((item) =>
      db.insert(inventory)
        .values({ productId: item.productId, quantity: -item.quantity })
        .onConflictDoUpdate({
          target: inventory.productId,
          set: { quantity: sql`${inventory.quantity} - ${item.quantity}` },
        })
    ),
  ]
  await db.batch(batchQueries as [typeof batchQueries[number], ...typeof batchQueries])

  if (cylinderChanges.length > 0) {
    await commitStockChanges(db, cylinderChanges, 'delivery', delivery.id, 'delivery', user)
  }

  let finalDelivery = delivery
  if (body.amountCollected > 0 && body.paymentMode) {
    await recordCustomerPayment(db, {
      customerId: body.customerId,
      deliveryId: delivery.id,
      amount: body.amountCollected,
      paymentDate: body.deliveryDate,
      paymentMode: body.paymentMode,
      notes: 'Collected at delivery',
      target: { type: 'fifo' },
      user,
    })
    finalDelivery = await db.select().from(deliveries).where(eq(deliveries.id, delivery.id)).get() ?? delivery
  } else if (isFreeDelivery) {
    await recordCustomerPayment(db, {
      customerId: body.customerId,
      deliveryId: delivery.id,
      amount: 0,
      paymentDate: body.deliveryDate,
      paymentMode: 'cash',
      notes: 'Free delivery — no charge',
      target: { type: 'fifo' },
      user,
    })
  }

  // Auto-create expense records for free accessories
  if (body.freeAccessories && body.freeAccessories.length > 0) {
    const customerName = await db.select({ name: customers.name }).from(customers).where(eq(customers.id, body.customerId)).get()
    const customerDisplayName = customerName?.name ?? 'Unknown'

    for (const fa of body.freeAccessories) {
      const [expense] = await db.insert(expenses).values({
        publicId: generateId(),
        expenseDate: body.deliveryDate,
        amount: fa.expenseAmount,
        tag: 'free_accessory',
        paymentSource: 'cash',
        notes: `Free accessory — ${customerDisplayName}`,
        createdBy: user.id,
        createdByName: user.fullName,
      }).returning()

      if (expense && fa.expenseAmount > 0) {
        await recordAccountTransaction(db, {
          accountType: 'cash' as AccountType,
          amount: -fa.expenseAmount,
          transactionType: 'expense',
          referenceId: expense.id,
          referenceType: 'expense',
          notes: `Free accessory — ${customerDisplayName}`,
          user,
        })
      }
    }
  }

  return { data: { ...finalDelivery, items: body.items } }
})
