// Sélecteur de langue. Le menu est toujours rendu dans le DOM ; sa visibilité
// est pilotée par la classe `lang--open` et par le CSS. Cela permet au menu
// mobile plein écran de l'afficher en ligne (CSS) sans dépendre de l'état React.
import { useEffect, useRef, useState } from 'react'
import { LANGS, useI18n } from '../i18n'

export function LangSwitcher() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  return (
    <div className={`lang ${open ? 'lang--open' : ''}`} ref={ref}>
      <button
        className="lang__toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.label')}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{current.flag}</span>
        <span className="lang__code">{current.code.toUpperCase()}</span>
      </button>
      <ul className="lang__menu" role="listbox" aria-label={t('lang.label')}>
        {LANGS.map((l) => (
          <li key={l.code}>
            <button
              role="option"
              aria-selected={l.code === lang}
              className={`lang__item ${l.code === lang ? 'is-active' : ''}`}
              onClick={() => {
                setLang(l.code)
                setOpen(false)
              }}
            >
              <span aria-hidden="true">{l.flag}</span> {l.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
