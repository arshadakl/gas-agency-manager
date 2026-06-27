export function useTheme() {
  const theme = useState<'dark' | 'light'>('theme', () => 'dark')

  function applyTheme(t: 'dark' | 'light') {
    theme.value = t
    if (import.meta.client) {
      document.documentElement.classList.toggle('light', t === 'light')
      localStorage.setItem('theme', t)
    }
  }

  function initTheme() {
    if (!import.meta.client) return
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
    applyTheme(saved ?? 'dark')
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  const isLight = computed(() => theme.value === 'light')

  return { theme, isLight, applyTheme, toggleTheme, initTheme }
}
