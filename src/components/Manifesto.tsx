import { useReveal } from '../hooks'
import { useI18n } from '../i18n'

export function Manifesto() {
  const { ref, visible } = useReveal<HTMLElement>()
  const { t } = useI18n()

  return (
    <section
      id="manifeste"
      ref={ref}
      className={`manifesto reveal ${visible ? 'is-visible' : ''}`}
    >
      <p className="section__kicker">{t('manifesto.kicker')}</p>
      <h2 className="manifesto__text">{t('manifesto.text')}</h2>
      <p className="manifesto__sign">{t('manifesto.sign')}</p>
    </section>
  )
}
