import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import {
  customers, products, inventory, deliveries, deliveryItems, customerPayments,
  purchases, purchaseItems, purchasePayments, orders, orderItems,
  expenses, accounts, accountTransactions, cylinderStock,
} from '~/server/database/schema'
import { generateId } from '~/server/utils/id'

const ROW = z.array(z.record(z.string(), z.unknown()))

const RestoreSchema = z.object({
  mode: z.enum(['wipe', 'merge']),
  data: z.object({
    customers: ROW.default([]),
    products: ROW.default([]),
    inventory: ROW.default([]),
    deliveries: ROW.default([]),
    deliveryItems: ROW.default([]),
    customerPayments: ROW.default([]),
    purchases: ROW.default([]),
    purchaseItems: ROW.default([]),
    purchasePayments: ROW.default([]),
    orders: ROW.default([]),
    orderItems: ROW.default([]),
    expenses: ROW.default([]),
    accounts: ROW.default([]),
    accountTransactions: ROW.default([]),
    cylinderStock: ROW.default([]),
  }),
})

type R = Record<string, unknown>
type Counts = { table: string; restored: number; skipped: number }
type RestoreCounts = {
  customers: Counts
  products: Counts
  inventory: Counts
  deliveries: Counts
  deliveryItems: Counts
  customerPayments: Counts
  purchases: Counts
  purchaseItems: Counts
  purchasePayments: Counts
  orders: Counts
  orderItems: Counts
  expenses: Counts
  accounts: Counts
  accountTransactions: Counts
  cylinderStock: Counts
}
const BATCH = 50

function batches<T>(a: T[]): T[][] {
  const o: T[][] = []
  for (let i = 0; i < a.length; i += BATCH) o.push(a.slice(i, i + BATCH))
  return o
}

function stripId(r: R): R {
  const d = { ...r }
  delete d.id
  if (!d.publicId) d.publicId = generateId()
  if (!d.createdAt) d.createdAt = new Date().toISOString()
  return d
}

function C(table: string): Counts {
  return { table, restored: 0, skipped: 0 }
}

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const { mode, data } = await parseBody(event, RestoreSchema)
  const db = useDB(event)

  const res: RestoreCounts = {
    customers: C('customers'), products: C('products'), inventory: C('inventory'),
    deliveries: C('deliveries'), deliveryItems: C('deliveryItems'),
    customerPayments: C('customerPayments'), purchases: C('purchases'),
    purchaseItems: C('purchaseItems'), purchasePayments: C('purchasePayments'),
    orders: C('orders'), orderItems: C('orderItems'), expenses: C('expenses'),
    accounts: C('accounts'), accountTransactions: C('accountTransactions'),
    cylinderStock: C('cylinderStock'),
  }

  // ── WIPE ────────────────────────────────────────────────────────────
  if (mode === 'wipe') {
    await db.delete(accountTransactions)
    await db.delete(purchasePayments)
    await db.delete(expenses)
    await db.delete(purchaseItems)
    await db.delete(purchases)
    await db.delete(orderItems)
    await db.delete(orders)
    await db.delete(deliveryItems)
    await db.delete(customerPayments)
    await db.delete(deliveries)
    await db.delete(inventory)
    await db.delete(customers)
    await db.delete(products)
    await db.delete(cylinderStock)
    await db.update(accounts).set({ balance: 0 })
  }

  // ── CUSTOMERS ───────────────────────────────────────────────────────
  const custRows = (data.customers ?? []) as R[]
  const existingCustPhones = mode === 'merge'
    ? new Set((await db.select({ phone: customers.phone }).from(customers).all()).map((r) => r.phone))
    : new Set<string>()

  const acceptedCustIds = new Set<number>()
  for (const batch of batches(custRows)) {
    const valid = batch.filter((r) => {
      if (mode === 'merge' && existingCustPhones.has(String(r.phone))) { res.customers.skipped++; return false }
      return true
    })
    for (const r of valid) { const id = Number(r.id); if (id) acceptedCustIds.add(id) }
    const stmts = valid.map((r) => db.insert(customers).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.customers.restored += stmts.length
  }

  // ── PRODUCTS ────────────────────────────────────────────────────────
  const prodRows = (data.products ?? []) as R[]
  const existingProdNames = mode === 'merge'
    ? new Set((await db.select({ name: products.name }).from(products).all()).map((r) => r.name))
    : new Set<string>()

  const acceptedProdIds = new Set<number>()
  for (const batch of batches(prodRows)) {
    const valid = batch.filter((r) => {
      if (mode === 'merge' && r.name && existingProdNames.has(String(r.name))) { res.products.skipped++; return false }
      return true
    })
    for (const r of valid) { const id = Number(r.id); if (id) acceptedProdIds.add(id) }
    const stmts = valid.map((r) => db.insert(products).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.products.restored += stmts.length
  }

  // ── INVENTORY ───────────────────────────────────────────────────────
  const invRows = (data.inventory ?? []).filter((r: R) => acceptedProdIds.has(Number(r.productId)) || mode === 'wipe') as R[]
  for (const batch of batches(invRows)) {
    const stmts = batch.map((r) => db.insert(inventory).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.inventory.restored += stmts.length
  }

  // ── DELIVERIES ──────────────────────────────────────────────────────
  const delRows = (data.deliveries ?? []) as R[]
  const existDelIds = mode === 'merge'
    ? new Set((await db.select({ id: deliveries.id }).from(deliveries).all()).map((r) => r.id))
    : new Set<number>()

  const acceptedDelIds = new Set<number>()
  for (const batch of batches(delRows)) {
    const valid = batch.filter((r) => {
      const id = Number(r.id)
      if (mode === 'merge' && id && existDelIds.has(id)) { res.deliveries.skipped++; return false }
      if (acceptedCustIds.size > 0 && !acceptedCustIds.has(Number(r.customerId))) { res.deliveries.skipped++; return false }
      return true
    })
    for (const r of valid) { const id = Number(r.id); if (id) acceptedDelIds.add(id) }
    const stmts = valid.map((r) => db.insert(deliveries).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.deliveries.restored += stmts.length
  }

  // ── DELIVERY ITEMS ──────────────────────────────────────────────────
  const delItemRows = (data.deliveryItems ?? []).filter((r: R) =>
    acceptedDelIds.has(Number(r.deliveryId)) && acceptedProdIds.has(Number(r.productId)),
  ) as R[]
  for (const batch of batches(delItemRows)) {
    const stmts = batch.map((r) => db.insert(deliveryItems).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.deliveryItems.restored += stmts.length
  }

  // ── CUSTOMER PAYMENTS ───────────────────────────────────────────────
  const cpRows = (data.customerPayments ?? []).filter((r: R) => {
    if (!acceptedCustIds.has(Number(r.customerId))) return false
    const delId = Number(r.deliveryId)
    if (delId && !acceptedDelIds.has(delId)) return false
    return true
  }) as R[]
  for (const batch of batches(cpRows)) {
    const stmts = batch.map((r) => db.insert(customerPayments).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.customerPayments.restored += stmts.length
  }

  // ── PURCHASES ───────────────────────────────────────────────────────
  const purchRows = (data.purchases ?? []) as R[]
  const existPurchIds = mode === 'merge'
    ? new Set((await db.select({ id: purchases.id }).from(purchases).all()).map((r) => r.id))
    : new Set<number>()

  const acceptedPurchIds = new Set<number>()
  for (const batch of batches(purchRows)) {
    const valid = batch.filter((r) => {
      const id = Number(r.id)
      if (mode === 'merge' && id && existPurchIds.has(id)) { res.purchases.skipped++; return false }
      return true
    })
    for (const r of valid) { const id = Number(r.id); if (id) acceptedPurchIds.add(id) }
    const stmts = valid.map((r) => db.insert(purchases).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.purchases.restored += stmts.length
  }

  // ── PURCHASE ITEMS ──────────────────────────────────────────────────
  const piRows = (data.purchaseItems ?? []).filter((r: R) => acceptedPurchIds.has(Number(r.purchaseId))) as R[]
  for (const batch of batches(piRows)) {
    const stmts = batch.map((r) => db.insert(purchaseItems).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.purchaseItems.restored += stmts.length
  }

  // ── PURCHASE PAYMENTS ───────────────────────────────────────────────
  const ppRows = (data.purchasePayments ?? []).filter((r: R) => acceptedPurchIds.has(Number(r.purchaseId))) as R[]
  for (const batch of batches(ppRows)) {
    const stmts = batch.map((r) => db.insert(purchasePayments).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.purchasePayments.restored += stmts.length
  }

  // ── ORDERS ──────────────────────────────────────────────────────────
  const orderRows = (data.orders ?? []) as R[]
  const existOrdIds = mode === 'merge'
    ? new Set((await db.select({ id: orders.id }).from(orders).all()).map((r) => r.id))
    : new Set<number>()

  const acceptedOrdIds = new Set<number>()
  for (const batch of batches(orderRows)) {
    const valid = batch.filter((r) => {
      const id = Number(r.id)
      if (mode === 'merge' && id && existOrdIds.has(id)) { res.orders.skipped++; return false }
      if (acceptedCustIds.size > 0 && !acceptedCustIds.has(Number(r.customerId))) { res.orders.skipped++; return false }
      return true
    })
    for (const r of valid) { const id = Number(r.id); if (id) acceptedOrdIds.add(id) }
    const stmts = valid.map((r) => db.insert(orders).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.orders.restored += stmts.length
  }

  // ── ORDER ITEMS ─────────────────────────────────────────────────────
  const oiRows = (data.orderItems ?? []).filter((r: R) =>
    acceptedOrdIds.has(Number(r.orderId)) && acceptedProdIds.has(Number(r.productId)),
  ) as R[]
  for (const batch of batches(oiRows)) {
    const stmts = batch.map((r) => db.insert(orderItems).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.orderItems.restored += stmts.length
  }

  // ── EXPENSES ────────────────────────────────────────────────────────
  const expRows = (data.expenses ?? []) as R[]
  const existExpIds = mode === 'merge'
    ? new Set((await db.select({ id: expenses.id }).from(expenses).all()).map((r) => r.id))
    : new Set<number>()

  for (const batch of batches(expRows)) {
    const valid = batch.filter((r) => {
      const id = Number(r.id)
      if (mode === 'merge' && id && existExpIds.has(id)) { res.expenses.skipped++; return false }
      return true
    })
    const stmts = valid.map((r) => db.insert(expenses).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.expenses.restored += stmts.length
  }

  // ── ACCOUNTS ────────────────────────────────────────────────────────
  for (const r of (data.accounts ?? []) as R[]) {
    const type = String(r.type) as 'cash' | 'bank'
    if (mode === 'merge') {
      await db.update(accounts).set({ balance: Number(r.balance) ?? 0 }).where(eq(accounts.type, type))
    } else {
      await db.insert(accounts).values({ type, balance: Number(r.balance) ?? 0 })
    }
    res.accounts.restored++
  }

  // ── ACCOUNT TRANSACTIONS ────────────────────────────────────────────
  const atRows = (data.accountTransactions ?? []) as R[]
  const existAtIds = mode === 'merge'
    ? new Set((await db.select({ id: accountTransactions.id }).from(accountTransactions).all()).map((r) => r.id))
    : new Set<number>()

  for (const batch of batches(atRows)) {
    const valid = batch.filter((r) => {
      const id = Number(r.id)
      if (mode === 'merge' && id && existAtIds.has(id)) { res.accountTransactions.skipped++; return false }
      return true
    })
    const stmts = valid.map((r) => db.insert(accountTransactions).values(stripId(r) as never))
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts])
    res.accountTransactions.restored += stmts.length
  }

  // ── CYLINDER STOCK ──────────────────────────────────────────────────
  for (const r of (data.cylinderStock ?? []) as R[]) {
    const size = Number(r.sizeKg)
    if (mode === 'merge') {
      await db.update(cylinderStock)
        .set({ fullCount: Number(r.fullCount) ?? 0, emptyCount: Number(r.emptyCount) ?? 0, ownCount: Number(r.ownCount) ?? 0 })
        .where(eq(cylinderStock.sizeKg, size))
    } else {
      await db.insert(cylinderStock).values({
        sizeKg: size,
        fullCount: Number(r.fullCount) ?? 0,
        emptyCount: Number(r.emptyCount) ?? 0,
        ownCount: Number(r.ownCount) ?? 0,
      })
    }
    res.cylinderStock.restored++
  }

  return { data: { mode, restored: res as RestoreCounts } }
})
