import { useEffect, useState } from 'react'
import { usePwaInstall } from '../hooks'
import { useI18n } from '../i18n'
import { LangSwitcher } from './LangSwitcher'
import logo from '../assets/logo-bmx.png'

const LINKS = [
  { href: '#manifeste', key: 'nav.manifesto' },
  { href: '#pourquoi', key: 'nav.why' },
  { href: '#tricks', key: 'nav.tricks' },
  { href: '#crew', key: 'nav.crew' },
  { href: '#roule', key: 'nav.roll' },
]

export function Nav() {
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { canInstall, promptInstall } = usePwaInstall()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Verrouille le scroll du body et permet de fermer le menu avec Échap.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      <a className="nav__brand" href="#top" aria-label={t('nav.home')}>
        <img className="nav__logo" src={logo} alt="bmx riders company" />
      </a>

      <nav className={`nav__links ${open ? 'nav__links--open' : ''}`} aria-label={t('nav.primary')}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {t(l.key)}
          </a>
        ))}
        {canInstall && (
          <button className="nav__install" onClick={promptInstall}>
            {t('nav.install')}
          </button>
        )}
        <LangSwitcher />
      </nav>

      <button
        className={`nav__burger ${open ? 'nav__burger--open' : ''}`}
        aria-label={open ? t('nav.menuClose') : t('nav.menuOpen')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  )
}
