import { CYLINDER_SIZES, type CylinderSize } from '~/types'
import type { CylinderStock } from '~/types/database'

interface PurchaseFormItem {
  sizeKg: CylinderSize
  receivedQty: number
  returnedQty: number
  newConnectionQty?: number
  emptyNewQty?: number
  cylinderCost?: number
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

  function buildPreview(
    items: PurchaseFormItem[],
    initialItems?: { sizeKg: CylinderSize; receivedQty: number; newConnectionQty?: number }[],
  ) {
    const initialBySize = new Map((initialItems ?? []).map((i) => [i.sizeKg, i]))
    return CYLINDER_SIZES.map((size) => {
      const current = currentStock.value[size] ?? { fullCount: 0, emptyCount: 0 }
      const item = items.find((i) => i.sizeKg === size)
      const init = initialBySize.get(size)

      const receivedQty = item?.receivedQty ?? 0
      const newConnectionQty = item?.newConnectionQty ?? 0

      // When editing an existing purchase, net stock change = new incoming minus what was already credited
      const fullChange = initialItems
        ? (receivedQty + newConnectionQty) - ((init?.receivedQty ?? 0) + (init?.newConnectionQty ?? 0))
        : (receivedQty + newConnectionQty)

      const newFull = current.fullCount + fullChange

      return {
        size,
        before: { fullCount: current.fullCount },
        fullChange,
        after: { fullCount: newFull },
        fullValid: newFull >= 0,
        isValid: newFull >= 0,
      }
    })
  }

  return { currentStock, loadCurrentStock, buildPreview }
}
