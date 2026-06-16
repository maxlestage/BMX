// i18n bmx — détection auto (navigateur) + mémorisation (localStorage).
// 7 langues : fr (défaut), en, es, de, pt, zh, ja. Usage : const { t, lang, setLang } = useI18n()
// puis t('hero.title'). Les valeurs peuvent contenir des retours ligne (\n).

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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

interface I18nState {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nState | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  // Détection au montage (évite un flash : on lit le stockage/navigateur côté client).
  useEffect(() => {
    setLangState(detectLang())
  }, [])

  // Tient l'attribut <html lang> à jour.
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }

  const t = useMemo(() => {
    const dict = DICTS[lang]
    return (key: string) => dict[key] ?? fr[key] ?? key
  }, [lang])

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n doit être utilisé dans <I18nProvider>')
  return ctx
}
