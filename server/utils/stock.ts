import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { cylinderStock, stockMovements } from '~/server/database/schema'
import type { CylinderSize, StockMovementType } from '~/types'

interface StockChange {
  sizeKg: CylinderSize
  fullChange: number
  emptyChange: number
}

// D1's drizzle driver has no real transaction support — see CLAUDE.md §23.4.
// Callers MUST call validateStockChanges *before* inserting the parent record
// (delivery/purchase) and its items, then commitStockChanges after. Validating
// only at commit time would leave an orphaned parent record on a 422 — there's
// no rollback to undo it.
export async function validateStockChanges(db: ReturnType<typeof useDB>, changes: StockChange[]) {
  for (const change of changes) {
    const current = await db.select()
      .from(cylinderStock)
      .where(eq(cylinderStock.sizeKg, change.sizeKg))
      .get()

    if (!current) {
      throw createError({ statusCode: 500, message: `Stock record not found for ${change.sizeKg}kg` })
    }

    if (current.fullCount + change.fullChange < 0) {
      throw createError({
        statusCode: 422,
        message: `Insufficient full cylinders for ${change.sizeKg}kg. Available: ${current.fullCount}`,
      })
    }
    if (current.emptyCount + change.emptyChange < 0) {
      throw createError({
        statusCode: 422,
        message: `Insufficient empty cylinders for ${change.sizeKg}kg. Available: ${current.emptyCount}`,
      })
    }
  }
}

export async function commitStockChanges(
  db: ReturnType<typeof useDB>,
  changes: StockChange[],
  movementType: StockMovementType,
  referenceId: number | null,
  referenceType: string,
  user: { id: number; fullName: string },
  notes?: string,
) {
  for (const change of changes) {
    const current = await db.select()
      .from(cylinderStock)
      .where(eq(cylinderStock.sizeKg, change.sizeKg))
      .get()
    if (!current) continue // already validated to exist by validateStockChanges

    await db.update(cylinderStock)
      .set({
        fullCount: current.fullCount + change.fullChange,
        emptyCount: current.emptyCount + change.emptyChange,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cylinderStock.sizeKg, change.sizeKg))

    await db.insert(stockMovements).values({
      sizeKg: change.sizeKg,
      movementType,
      fullChange: change.fullChange,
      emptyChange: change.emptyChange,
      referenceId,
      referenceType,
      notes,
      createdBy: user.id,
      createdByName: user.fullName,
    })
  }
}

// Convenience wrapper for call sites that don't need the validate/commit split
// (e.g. manual adjustment, where there's no parent record to orphan).
export async function applyStockChanges(
  db: ReturnType<typeof useDB>,
  changes: StockChange[],
  movementType: StockMovementType,
  referenceId: number | null,
  referenceType: string,
  user: { id: number; fullName: string },
  notes?: string,
) {
  await validateStockChanges(db, changes)
  await commitStockChanges(db, changes, movementType, referenceId, referenceType, user, notes)
}
