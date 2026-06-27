interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isInstalled = ref(false)

export function usePwaInstall() {
  const isInstallable = computed(() => deferredPrompt.value !== null && !isInstalled.value)

  function init() {
    if (!import.meta.client) return

    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true
      return
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt.value = e as BeforeInstallPromptEvent
    })

    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      deferredPrompt.value = null
    })
  }

  async function install() {
    if (!deferredPrompt.value) return
    await deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      isInstalled.value = true
      deferredPrompt.value = null
    }
  }

  return { isInstallable, isInstalled, install, init }
}
