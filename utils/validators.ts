import { z } from 'zod'
import { ROLES, PAYMENT_MODES, PRODUCT_TYPES, PURCHASE_PAYMENT_MODES, DELIVERY_PAYMENT_STATUSES } from '~/types'

export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number')

export const cylinderSizeSchema = z.union([z.literal(12), z.literal(17), z.literal(33)])

export const CustomerSchema = z.object({
  name: z.string().min(2).max(100),
  contactPerson: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  phone: phoneSchema,
  whatsappNumber: phoneSchema.optional(),
  address: z.string().max(300).optional(),
})

export const ProductSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(PRODUCT_TYPES),
  cylinderSize: z.number().int().positive().optional(),
  unit: z.string().min(1).max(20).default('pcs'),
})

export const DeliverySchema = z.object({
  customerId: z.number().int().positive(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalAmount: z.number().positive(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().positive(),
  })).min(1),
  notes: z.string().max(500).optional(),
  paymentStatus: z.enum(DELIVERY_PAYMENT_STATUSES).default('pending'),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
}).refine((data) => data.paymentStatus !== 'paid' || !!data.paymentMode, {
  message: 'paymentMode is required when paymentStatus is paid',
  path: ['paymentMode'],
})

export const PaymentSchema = z.object({
  customerId: z.number().int().positive(),
  amount: z.number().positive(),
  paymentMode: z.enum(PAYMENT_MODES),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
})

export const UserSchema = z.object({
  username: z.string().min(3).max(50),
  fullName: z.string().min(2).max(100),
  role: z.enum([ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER]),
  password: z.string().min(8).max(100),
})

export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

export const PurchaseSchema = z.object({
  supplier: z.string().min(1).max(100),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  invoiceNo: z.string().max(50).optional(),
  totalAmount: z.number().positive(),
  amountPaid: z.number().min(0),
  paymentMode: z.enum(PURCHASE_PAYMENT_MODES).optional(),
  paymentReference: z.string().max(100).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    sizeKg: cylinderSizeSchema,
    receivedQty: z.number().int().min(0),
    returnedQty: z.number().int().min(0),
    unitPrice: z.number().positive().optional(),
  })).min(1),
})

export const ReportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const StockAdjustmentSchema = z.object({
  sizeKg: cylinderSizeSchema,
  fullChange: z.number().int(),
  emptyChange: z.number().int(),
  notes: z.string().max(500).optional(),
})
