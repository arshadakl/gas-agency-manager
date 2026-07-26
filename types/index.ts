export const ROLES = {
  ADMIN: 'admin',
  DELIVERY: 'delivery',
  VIEWER: 'viewer',
} as const
export type Role = typeof ROLES[keyof typeof ROLES]

export const CYLINDER_SIZES = [12, 17, 21, 33] as const
export type CylinderSize = typeof CYLINDER_SIZES[number]

export const PAYMENT_MODES = ['cash', 'upi', 'bank', 'cheque'] as const
export type PaymentMode = typeof PAYMENT_MODES[number]

export const PRODUCT_TYPES = ['cylinder', 'accessory'] as const
export type ProductType = typeof PRODUCT_TYPES[number]

export const DELIVERY_STATUSES = ['pending', 'delivered', 'cancelled'] as const
export type DeliveryStatus = typeof DELIVERY_STATUSES[number]

export const STOCK_MOVEMENT_TYPES = ['delivery', 'purchase', 'adjustment'] as const
export type StockMovementType = typeof STOCK_MOVEMENT_TYPES[number]

export const PURCHASE_PAYMENT_MODES = ['cash', 'bank'] as const
export type PurchasePaymentMode = typeof PURCHASE_PAYMENT_MODES[number]

export const PURCHASE_PAYMENT_STATUSES = ['paid', 'partial', 'pending'] as const
export type PurchasePaymentStatus = typeof PURCHASE_PAYMENT_STATUSES[number]

export const DELIVERY_PAYMENT_STATUSES = ['paid', 'partial', 'pending'] as const
export type DeliveryPaymentStatus = typeof DELIVERY_PAYMENT_STATUSES[number]

export const ORDER_STATUSES = ['pending', 'delivered', 'cancelled'] as const
export type OrderStatus = typeof ORDER_STATUSES[number]

export const EXPENSE_TAGS = ['fuel', 'maintenance', 'fine', 'other'] as const
export type ExpenseTag = typeof EXPENSE_TAGS[number]

export const PAYMENT_SOURCES = ['cash', 'bank'] as const
export type PaymentSource = typeof PAYMENT_SOURCES[number]

export const ACCOUNT_TYPES = ['cash', 'bank'] as const
export type AccountType = typeof ACCOUNT_TYPES[number]

export const ACCOUNT_TRANSACTION_TYPES = ['delivery_collection', 'payment_received', 'purchase_paid', 'purchase_clear', 'expense', 'conversion_in', 'conversion_out', 'adjustment'] as const
export type AccountTransactionType = typeof ACCOUNT_TRANSACTION_TYPES[number]
