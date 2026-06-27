import { en, ml } from '~/utils/i18n'
import type { TranslationKey } from '~/utils/i18n'

type Locale = 'en' | 'ml'

const locale = ref<Locale>('en')

export function useLocale() {
  const isMalayalam = computed(() => locale.value === 'ml')

  function t(key: TranslationKey): string {
    const dict = locale.value === 'ml' ? ml : en
    return dict[key]
  }

  function apply(l: Locale) {
    locale.value = l
    if (import.meta.client) {
      localStorage.setItem('locale', l)
      document.documentElement.lang = l === 'ml' ? 'ml' : 'en'
    }
  }

  function init() {
    if (!import.meta.client) return
    const saved = localStorage.getItem('locale') as Locale | null
    apply(saved ?? 'en')
  }

  function toggleLocale() {
    apply(locale.value === 'en' ? 'ml' : 'en')
  }

  return { locale, isMalayalam, t, init, toggleLocale, apply }
}
