interface Toast {
  id: number
  message: string
  variant: 'default' | 'destructive'
}

let nextId = 1

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function showToast(message: string, variant: Toast['variant'] = 'default') {
    const id = nextId++
    toasts.value.push({ id, message, variant })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 3000)
  }

  return { toasts, showToast }
}
