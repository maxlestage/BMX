import { useI18n } from '../i18n'

export function Marquee() {
  const { t } = useI18n()
  const words = [
    t('marquee.1'),
    t('marquee.2'),
    t('marquee.3'),
    t('marquee.4'),
    t('marquee.5'),
    t('marquee.6'),
  ]
  // Doublé pour une boucle continue sans coupure.
  const items = [...words, ...words]
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {items.map((w, i) => (
          <span key={i} className="marquee__item">
            {w}
            <span className="marquee__star">★</span>
          </span>
        ))}
      </div>
    </div>
  )
}
