import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type {
  users,
  customers,
  products,
  inventory,
  deliveries,
  deliveryItems,
  customerPayments,
  cylinderStock,
  stockMovements,
  purchases,
  purchaseItems,
  purchasePayments,
  orders,
  orderItems,
  expenses,
  accounts,
  accountTransactions,
} from '~/server/database/schema'

export type User = Omit<InferSelectModel<typeof users>, 'passwordHash'>
export type NewUser = InferInsertModel<typeof users>

export type Customer = InferSelectModel<typeof customers>
export type NewCustomer = InferInsertModel<typeof customers>

export type Product = InferSelectModel<typeof products>
export type NewProduct = InferInsertModel<typeof products>


export type InventoryItem = InferSelectModel<typeof inventory>
export type NewInventoryItem = InferInsertModel<typeof inventory>

export type Delivery = InferSelectModel<typeof deliveries>
export type NewDelivery = InferInsertModel<typeof deliveries>

export type DeliveryItem = InferSelectModel<typeof deliveryItems>
export type NewDeliveryItem = InferInsertModel<typeof deliveryItems>

export type CustomerPayment = InferSelectModel<typeof customerPayments>
export type NewCustomerPayment = InferInsertModel<typeof customerPayments>

export type CylinderStock = InferSelectModel<typeof cylinderStock>
export type NewCylinderStock = InferInsertModel<typeof cylinderStock>

export type StockMovement = InferSelectModel<typeof stockMovements>
export type NewStockMovement = InferInsertModel<typeof stockMovements>

export type Purchase = InferSelectModel<typeof purchases>
export type NewPurchase = InferInsertModel<typeof purchases>

export type PurchaseItem = InferSelectModel<typeof purchaseItems>
export type NewPurchaseItem = InferInsertModel<typeof purchaseItems>

export type DeliveryWithRelations = Delivery & {
  customer: Pick<Customer, 'id' | 'publicId' | 'name' | 'contactPerson' | 'area'>
  items: Array<DeliveryItem & { product: Product }>
}

export type CustomerWithBalance = Customer & {
  totalBilled: number
  totalPaid: number
  balance: number
  pendingDeliveryCount: number
}

export type Order = InferSelectModel<typeof orders>
export type NewOrder = InferInsertModel<typeof orders>

export type OrderItem = InferSelectModel<typeof orderItems>
export type NewOrderItem = InferInsertModel<typeof orderItems>

export type OrderWithRelations = Order & {
  customer: Pick<Customer, 'id' | 'name' | 'contactPerson' | 'area'>
  items: Array<OrderItem & { product: Product }>
}

export type Expense = InferSelectModel<typeof expenses>
export type NewExpense = InferInsertModel<typeof expenses>

export type Account = InferSelectModel<typeof accounts>
export type NewAccount = InferInsertModel<typeof accounts>

export type AccountTransaction = InferSelectModel<typeof accountTransactions>
export type NewAccountTransaction = InferInsertModel<typeof accountTransactions>

export type PurchasePayment = InferSelectModel<typeof purchasePayments>
export type NewPurchasePayment = InferInsertModel<typeof purchasePayments>
