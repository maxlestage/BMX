// i18n bmx — store réactif (module singleton) + détection auto + mémorisation.
// 7 langues : fr (défaut), en, es, de, pt, zh, ja.
// Usage : const { t, lang, setLang } = useI18n() puis t('hero.title') / {{ t('x') }}.
import { computed, reactive, type ComputedRef } from 'vue'
import { fr } from './locales/fr'
import { en } from './locales/en'
import { es } from './locales/es'
import { de } from './locales/de'
import { pt } from './locales/pt'
import { zh } from './locales/zh'
import { ja } from './locales/ja'

export type Lang = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'zh' | 'ja'

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

const DICTS: Record<Lang, Record<string, string>> = { fr, en, es, de, pt, zh, ja }
const STORAGE_KEY = 'bmx.lang'

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && saved in DICTS) return saved as Lang
  } catch {
    /* stockage indisponible */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2).toLowerCase() : 'fr'
  return (nav in DICTS ? nav : 'fr') as Lang
}

const state = reactive<{ lang: Lang }>({ lang: 'fr' })

export function initI18n() {
  state.lang = detectLang()
  if (typeof document !== 'undefined') document.documentElement.lang = state.lang
}

function setLang(l: Lang) {
  state.lang = l
  try {
    localStorage.setItem(STORAGE_KEY, l)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = l
}

/** Traduction réactive : lit `state.lang` à chaque appel → re-rend au changement. */
function t(key: string): string {
  const dict = DICTS[state.lang]
  return dict[key] ?? fr[key] ?? key
}

interface I18nApi {
  lang: ComputedRef<Lang>
  setLang: (l: Lang) => void
  t: (key: string) => string
}

export function useI18n(): I18nApi {
  return {
    lang: computed(() => state.lang),
    setLang,
    t,
  }
}
