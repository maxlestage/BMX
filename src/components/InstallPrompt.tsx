import { useEffect, useState } from 'react'
import { usePwaInstall } from '../hooks'
import { useI18n } from '../i18n'

const DISMISS_KEY = 'bmx:install-dismissed'

export function InstallPrompt() {
  const { t } = useI18n()
  const { canInstall, isIos, isStandalone, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1',
  )

  const close = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // localStorage indisponible (mode privé) — on ignore.
    }
  }

  // Disparaît tout seul après 12 s pour ne pas gêner la lecture.
  useEffect(() => {
    if (dismissed) return
    const id = setTimeout(() => setDismissed(true), 12000)
    return () => clearTimeout(id)
  }, [dismissed])

  // Déjà installée, déjà refusée, ou rien à proposer → on n'affiche rien.
  if (isStandalone || dismissed) return null
  if (!canInstall && !isIos) return null

  return (
    <div className="install" role="dialog" aria-label={t('install.dialog')}>
      <span className="install__icon" aria-hidden="true">
        🚲
      </span>
      <div className="install__copy">
        <strong>{t('install.title')}</strong>
        <span>{isIos ? t('install.ios') : t('install.generic')}</span>
      </div>
      {canInstall && (
        <button className="install__cta" onClick={promptInstall}>
          {t('install.cta')}
        </button>
      )}
      <button className="install__close" aria-label={t('install.close')} onClick={close}>
        ×
      </button>
    </div>
  )
}
