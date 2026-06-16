import { useReveal } from '../hooks'
import { useI18n } from '../i18n'

// Canaux de contact — chacun ouvre le client mail de l'utilisateur.
const CHANNELS = [
  { key: 'support', icon: '💬', email: 'hello@bmx.bike' },
  { key: 'press', icon: '📰', email: 'press@bmx.bike' },
  { key: 'partners', icon: '🤝', email: 'partners@bmx.bike' },
  { key: 'privacy', icon: '🔒', email: 'privacy@bmx.bike' },
]

export function Contact() {
  const { ref, visible } = useReveal<HTMLElement>()
  const { t } = useI18n()

  return (
    <section id="contact" ref={ref} className={`contact reveal ${visible ? 'is-visible' : ''}`}>
      <header className="contact__head">
        <p className="section__kicker">{t('contact.kicker')}</p>
        <h2 className="section__title">{t('contact.title')}</h2>
        <p className="contact__sub">{t('contact.sub')}</p>
      </header>

      <div className="contact__grid">
        {CHANNELS.map((c, i) => (
          <a
            className="card contact__card"
            key={c.key}
            href={`mailto:${c.email}`}
            style={{ ['--delay' as string]: `${i * 90}ms` }}
          >
            <span className="card__icon" aria-hidden="true">
              {c.icon}
            </span>
            <h3 className="card__title">{t(`contact.${c.key}.title`)}</h3>
            <p className="card__text">{t(`contact.${c.key}.text`)}</p>
            <span className="contact__mail">{c.email}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
