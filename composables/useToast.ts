import { formatApiError } from '~/utils/apiError'

export interface Toast {
  id: number
  message: string
  variant: 'default' | 'destructive' | 'success' | 'warning'
  title?: string
}

let nextId = 1
const recentMessages = new Map<string, number>()

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function removeToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function showToast(
    message: string,
    variant: Toast['variant'] = 'default',
    title?: string
  ) {
    if (!message) return

    // De-duplicate identical toasts triggered within 1.5s
    const now = Date.now()
    const lastSeen = recentMessages.get(message)
    if (lastSeen && now - lastSeen < 1500) {
      return
    }
    recentMessages.set(message, now)
    setTimeout(() => recentMessages.delete(message), 2000)

    const id = nextId++
    toasts.value.push({ id, message, variant, title })

    // Destructive errors stay visible slightly longer for readability
    const duration = variant === 'destructive' ? 6000 : 3500
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  function showError(err: unknown, fallback = 'Operation failed') {
    const message = formatApiError(err, fallback)
    showToast(message, 'destructive')
    return message
  }

  function showSuccess(message: string, title?: string) {
    showToast(message, 'success', title)
  }

  return { toasts, showToast, showError, showSuccess, removeToast }
}
