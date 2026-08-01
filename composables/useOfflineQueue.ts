import type { DeliveryCreatePayload } from '~/composables/useDeliveries'

interface PendingDelivery extends DeliveryCreatePayload {
  localId?: number
  queuedAt: string
}

const DB_NAME = 'gas-supplier-offline'
const STORE_NAME = 'pending_deliveries'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'localId', autoIncrement: true })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function useOfflineQueue() {
  async function queueDelivery(data: DeliveryCreatePayload) {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add({ ...data, queuedAt: new Date().toISOString() })
    return new Promise<void>((resolve) => { tx.oncomplete = () => resolve() })
  }

  async function getPendingDeliveries(): Promise<PendingDelivery[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async function removePendingDelivery(localId: number) {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(localId)
    return new Promise<void>((resolve) => { tx.oncomplete = () => resolve() })
  }

  async function syncPendingDeliveries() {
    const pending = await getPendingDeliveries()
    for (const item of pending) {
      try {
        await $fetch('/api/deliveries', { method: 'POST', body: item })
        if (item.localId) await removePendingDelivery(item.localId)
      } catch {
        // Continue with remaining items instead of breaking
      }
    }
  }

  return { queueDelivery, getPendingDeliveries, removePendingDelivery, syncPendingDeliveries }
}
