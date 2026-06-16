import { useReveal } from '../hooks'
import { useI18n } from '../i18n'

const REASONS = [
  { n: '01', icon: '🚲', key: 1 },
  { n: '02', icon: '🤝', key: 2 },
  { n: '03', icon: '🔁', key: 3 },
  { n: '04', icon: '🎨', key: 4 },
]

export function Reasons() {
  const { ref, visible } = useReveal<HTMLElement>()
  const { t } = useI18n()

  return (
    <section id="pourquoi" ref={ref} className={`reasons reveal ${visible ? 'is-visible' : ''}`}>
      <header className="reasons__head">
        <p className="section__kicker">{t('reasons.kicker')}</p>
        <h2 className="section__title">{t('reasons.title')}</h2>
      </header>

      <div className="reasons__grid">
        {REASONS.map((r, i) => (
          <article className="card" key={r.n} style={{ ['--delay' as string]: `${i * 90}ms` }}>
            <span className="card__num">{r.n}</span>
            <span className="card__icon" aria-hidden="true">
              {r.icon}
            </span>
            <h3 className="card__title">{t(`reasons.${r.key}.title`)}</h3>
            <p className="card__text">{t(`reasons.${r.key}.text`)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
