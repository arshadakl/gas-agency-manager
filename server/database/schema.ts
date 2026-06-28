import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

const timestamps = {
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
}

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role', { enum: ['admin', 'delivery', 'viewer'] }).notNull(),
  isActive: integer('is_active').default(1).notNull(),
  ...timestamps,
})

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  area: text('area'),
  phone: text('phone').notNull(),
  whatsappNumber: text('whatsapp_number'),
  address: text('address'),
  isActive: integer('is_active').default(1).notNull(),
  ...timestamps,
})

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['cylinder', 'accessory'] }).notNull(),
  cylinderSize: integer('cylinder_size'),
  unit: text('unit').default('pcs').notNull(),
  isActive: integer('is_active').default(1).notNull(),
  ...timestamps,
}, (table) => ({
  typeIdx: index('products_type_idx').on(table.type),
}))


export const inventory = sqliteTable('inventory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull().unique(),
  quantity: real('quantity').default(0).notNull(),
  ...timestamps,
}, (table) => ({
  productIdx: index('inventory_product_idx').on(table.productId),
}))

export const deliveries = sqliteTable('deliveries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  deliveryDate: text('delivery_date').notNull(),
  status: text('status', { enum: ['pending', 'delivered', 'cancelled'] })
    .default('pending').notNull(),
  // Whether the customer paid at the moment of delivery (cash-in-hand) vs.
  // settling later — distinct from `status` (fulfillment), this is purely
  // about cash flow. 'paid' auto-creates a matching customer_payments row
  // (see server/utils/payment.ts) so ledger/outstanding calculations never
  // need to know about this flag — it's just a UI/workflow trigger.
  paymentStatus: text('payment_status', { enum: ['paid', 'pending'] })
    .default('pending').notNull(),
  totalAmount: real('total_amount').notNull(),
  whatsappSent: integer('whatsapp_sent').default(0).notNull(),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdByName: text('created_by_name').notNull(),
  ...timestamps,
}, (table) => ({
  customerIdx: index('deliveries_customer_idx').on(table.customerId),
  dateIdx: index('deliveries_date_idx').on(table.deliveryDate),
  createdByIdx: index('deliveries_created_by_idx').on(table.createdBy),
}))

export const deliveryItems = sqliteTable('delivery_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deliveryId: integer('delivery_id').references(() => deliveries.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: real('quantity').notNull(),
  ...timestamps,
}, (table) => ({
  deliveryIdx: index('delivery_items_delivery_idx').on(table.deliveryId),
  productIdx: index('delivery_items_product_idx').on(table.productId),
}))

export const customerPayments = sqliteTable('customer_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  // Set only for payments auto-created at delivery time (paymentStatus:'paid')
  // — lets "today's collections" show an itemized cylinder breakdown for
  // those rows. Manual settle-up payments via /payments leave this null.
  deliveryId: integer('delivery_id').references(() => deliveries.id),
  amount: real('amount').notNull(),
  paymentMode: text('payment_mode', { enum: ['cash', 'upi', 'bank', 'cheque'] }).notNull(),
  paymentDate: text('payment_date').notNull(),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdByName: text('created_by_name').notNull(),
  ...timestamps,
}, (table) => ({
  customerIdx: index('customer_payments_customer_idx').on(table.customerId),
  dateIdx: index('customer_payments_date_idx').on(table.paymentDate),
  deliveryIdx: index('customer_payments_delivery_idx').on(table.deliveryId),
}))

// Single row per cylinder size — source of truth for current stock (§23.3)
export const cylinderStock = sqliteTable('cylinder_stock', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sizeKg: integer('size_kg').notNull().unique(),
  fullCount: integer('full_count').default(0).notNull(),
  emptyCount: integer('empty_count').default(0).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
})

// Immutable log of every stock change — never delete from this table
export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sizeKg: integer('size_kg').notNull(),
  movementType: text('movement_type', { enum: ['delivery', 'purchase', 'adjustment'] }).notNull(),
  fullChange: integer('full_change').notNull(),
  emptyChange: integer('empty_change').notNull(),
  referenceId: integer('reference_id'),
  referenceType: text('reference_type'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdByName: text('created_by_name').notNull(),
  ...timestamps,
}, (table) => ({
  sizeIdx: index('stock_movements_size_idx').on(table.sizeKg),
  typeIdx: index('stock_movements_type_idx').on(table.movementType),
  refIdx: index('stock_movements_ref_idx').on(table.referenceId, table.referenceType),
}))

export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  supplier: text('supplier').notNull(),
  purchaseDate: text('purchase_date').notNull(),
  invoiceNo: text('invoice_no'),
  totalAmount: real('total_amount').notNull(),
  amountPaid: real('amount_paid').default(0).notNull(),
  paymentMode: text('payment_mode', { enum: ['cash', 'upi', 'bank', 'credit'] }),
  paymentStatus: text('payment_status', { enum: ['paid', 'partial', 'pending'] })
    .default('pending').notNull(),
  paymentReference: text('payment_reference'),
  dueDate: text('due_date'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdByName: text('created_by_name').notNull(),
  ...timestamps,
}, (table) => ({
  dateIdx: index('purchases_date_idx').on(table.purchaseDate),
  statusIdx: index('purchases_status_idx').on(table.paymentStatus),
}))

// A customer calling in to book a cylinder — no stock/price impact until
// converted to a real delivery via POST /api/orders/:id/deliver (§ "Orders").
export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  orderDate: text('order_date').notNull(),
  status: text('status', { enum: ['pending', 'delivered', 'cancelled'] })
    .default('pending').notNull(),
  notes: text('notes'),
  deliveryId: integer('delivery_id').references(() => deliveries.id),
  deliveredAt: text('delivered_at'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdByName: text('created_by_name').notNull(),
  ...timestamps,
}, (table) => ({
  customerIdx: index('orders_customer_idx').on(table.customerId),
  statusIdx: index('orders_status_idx').on(table.status),
  dateIdx: index('orders_date_idx').on(table.orderDate),
}))

export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: real('quantity').notNull(),
}, (table) => ({
  orderIdx: index('order_items_order_idx').on(table.orderId),
}))

export const purchaseItems = sqliteTable('purchase_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchaseId: integer('purchase_id').references(() => purchases.id).notNull(),
  sizeKg: integer('size_kg').notNull(),
  receivedQty: integer('received_qty').default(0).notNull(),
  returnedQty: integer('returned_qty').default(0).notNull(),
  unitPrice: real('unit_price'),
}, (table) => ({
  purchaseIdx: index('purchase_items_purchase_idx').on(table.purchaseId),
}))
