import { useState } from 'react'
import { useReveal } from '../hooks'
import { useI18n } from '../i18n'

// Les noms de tricks sont des termes universels (non traduits) ; le niveau et
// la description viennent du dictionnaire.
const TRICKS = ['Ollie', 'Kickflip', 'Boardslide', 'Manual', '50-50 grind']

export function Tricks() {
  const { ref, visible } = useReveal<HTMLElement>()
  const { t } = useI18n()
  const [active, setActive] = useState(0)

  return (
    <section id="tricks" ref={ref} className={`tricks reveal ${visible ? 'is-visible' : ''}`}>
      <header className="tricks__head">
        <p className="section__kicker">{t('tricks.kicker')}</p>
        <h2 className="section__title">{t('tricks.title')}</h2>
      </header>

      <div className="tricks__list" role="tablist" aria-label={t('tricks.list')}>
        {TRICKS.map((name, i) => {
          const open = i === active
          return (
            <button
              key={name}
              role="tab"
              aria-selected={open}
              className={`trick ${open ? 'trick--open' : ''}`}
              onClick={() => setActive(i)}
            >
              <span className="trick__index">{String(i + 1).padStart(2, '0')}</span>
              <span className="trick__body">
                <span className="trick__name">{name}</span>
                <span className="trick__level">{t(`tricks.${i + 1}.level`)}</span>
                <span className="trick__text">{t(`tricks.${i + 1}.text`)}</span>
              </span>
              <span className="trick__chevron" aria-hidden="true">
                {open ? '–' : '+'}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
