import type { H3Event } from 'h3'
import { and, eq, isNull, lte, or, desc } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { prices } from '~/server/database/schema'

export async function resolvePrice(
  event: H3Event,
  productId: number,
  customerId: number,
  deliveryDate: string,
): Promise<number> {
  const db = useDB(event)

  const candidates = await db.select()
    .from(prices)
    .where(and(
      eq(prices.productId, productId),
      or(eq(prices.customerId, customerId), isNull(prices.customerId)),
      lte(prices.effectiveFrom, deliveryDate),
    ))
    .orderBy(desc(prices.effectiveFrom))
    .all()

  const customerSpecific = candidates.find((p) => p.customerId === customerId)
  const fallback = candidates.find((p) => p.customerId === null)
  const resolved = customerSpecific ?? fallback

  if (!resolved) {
    throw createError({ statusCode: 422, message: 'No price configured for this product' })
  }

  return resolved.price
}
