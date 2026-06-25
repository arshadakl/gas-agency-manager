import { CYLINDER_SIZES, type CylinderSize } from '~/types'
import type { CylinderStock } from '~/types/database'

interface PurchaseFormItem {
  sizeKg: CylinderSize
  receivedQty: number
  returnedQty: number
  unitPrice?: number
}

export function usePurchaseForm() {
  const { fetchCylinderStock } = useInventory()
  const currentStock = ref<Record<CylinderSize, CylinderStock>>({} as Record<CylinderSize, CylinderStock>)

  async function loadCurrentStock() {
    const rows = await fetchCylinderStock()
    for (const row of rows) {
      currentStock.value[row.sizeKg as CylinderSize] = row
    }
  }

  function buildPreview(items: PurchaseFormItem[]) {
    return CYLINDER_SIZES.map((size) => {
      const current = currentStock.value[size] ?? { fullCount: 0, emptyCount: 0 }
      const item = items.find((i) => i.sizeKg === size)

      const receivedQty = item?.receivedQty ?? 0
      const returnedQty = item?.returnedQty ?? 0

      const newFull = current.fullCount + receivedQty
      const newEmpty = current.emptyCount - returnedQty

      return {
        size,
        before: { fullCount: current.fullCount, emptyCount: current.emptyCount },
        fullChange: receivedQty,
        emptyChange: -returnedQty,
        after: { fullCount: newFull, emptyCount: newEmpty },
        fullValid: newFull >= 0,
        emptyValid: newEmpty >= 0,
        isValid: newFull >= 0 && newEmpty >= 0,
      }
    })
  }

  return { currentStock, loadCurrentStock, buildPreview }
}
