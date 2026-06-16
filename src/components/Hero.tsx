import { useI18n } from '../i18n'
import logo from '../assets/logo-bmx-neon.png'

export function Hero() {
  const { t } = useI18n()
  return (
    <section className="hero" id="top">
      <div className="hero__inner">
        <img className="hero__logo" src={logo} alt="bmx riders company" />

        <h1 className="hero__title">
          {t('hero.title.l1')}
          <br />
          {t('hero.title.l2a')}
          <span className="hero__accent">{t('hero.title.accent')}</span>.
        </h1>

        <p className="hero__lede">{t('hero.lede')}</p>

        <div className="hero__cta">
          <a className="btn btn--solid" href="#manifeste">
            {t('hero.cta.manifesto')}
          </a>
          <a className="btn btn--ghost" href="#roule">
            {t('hero.cta.join')}
          </a>
        </div>
      </div>

      <a className="hero__scroll" href="#manifeste" aria-label={t('hero.scrollAria')}>
        <span>{t('hero.scroll')}</span>
        <span className="hero__scroll-line" />
      </a>
    </section>
  )
}
