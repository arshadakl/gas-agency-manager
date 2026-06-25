import { useDB } from '~/server/database'
import {
  customers, products, prices, inventory, deliveries, deliveryItems, customerPayments, users,
  purchases, purchaseItems, cylinderStock, stockMovements, orders, orderItems,
} from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const key = getRequestHeader(event, 'x-backup-key')

  if (!key || key !== config.backupSecret) {
    throw createError({ statusCode: 401, message: 'Invalid backup key' })
  }

  const db = useDB(event)

  const [
    customerRows, productRows, priceRows, inventoryRows,
    deliveryRows, deliveryItemRows, paymentRows, userRows,
    purchaseRows, purchaseItemRows, cylinderStockRows, stockMovementRows,
    orderRows, orderItemRows,
  ] = await Promise.all([
    db.select().from(customers).all(),
    db.select().from(products).all(),
    db.select().from(prices).all(),
    db.select().from(inventory).all(),
    db.select().from(deliveries).all(),
    db.select().from(deliveryItems).all(),
    db.select().from(customerPayments).all(),
    db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).all(),
    db.select().from(purchases).all(),
    db.select().from(purchaseItems).all(),
    db.select().from(cylinderStock).all(),
    db.select().from(stockMovements).all(),
    db.select().from(orders).all(),
    db.select().from(orderItems).all(),
  ])

  return {
    data: {
      customers: customerRows,
      products: productRows,
      prices: priceRows,
      inventory: inventoryRows,
      deliveries: deliveryRows,
      deliveryItems: deliveryItemRows,
      customerPayments: paymentRows,
      users: userRows,
      purchases: purchaseRows,
      purchaseItems: purchaseItemRows,
      cylinderStock: cylinderStockRows,
      stockMovements: stockMovementRows,
      orders: orderRows,
      orderItems: orderItemRows,
      exportedAt: new Date().toISOString(),
    },
  }
})
