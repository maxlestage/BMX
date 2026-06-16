import { useState } from 'react'
import { useReveal } from '../hooks'
import { useI18n } from '../i18n'

export function Join() {
  const { ref, visible } = useReveal<HTMLElement>()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    // Pas de backend : on célèbre localement l'intention de rouler avec nous.
    setSent(true)
  }

  return (
    <section id="roule" ref={ref} className={`join reveal ${visible ? 'is-visible' : ''}`}>
      <div className="join__card">
        <p className="section__kicker">{t('join.kicker')}</p>
        <h2 className="join__title">{t('join.title')}</h2>
        <p className="join__lede">{t('join.lede')}</p>

        {sent ? (
          <p className="join__thanks" role="status">
            {t('join.thanks')}
          </p>
        ) : (
          <form className="join__form" onSubmit={submit}>
            <input
              type="email"
              required
              placeholder={t('join.placeholder')}
              aria-label={t('join.emailAria')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="btn btn--solid">
              {t('join.submit')}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
