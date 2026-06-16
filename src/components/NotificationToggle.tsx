// Réglage « Notifications » : opt-in Web Push pour les nouveaux messages.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push'

export function NotificationToggle() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPushState().then(setState)
  }, [])

  if (!user) return null // proposé seulement aux membres connectés
  if (state === null) return null

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      const next = state === 'on' ? await disablePush() : await enablePush()
      setState(next)
      if (next === 'denied') setError(t('push.denied'))
    } catch {
      setError(t('push.error'))
    } finally {
      setBusy(false)
    }
  }

  // États non actionnables : on affiche une note informative.
  const note =
    state === 'unsupported'
      ? t('push.unsupported')
      : state === 'ios-install'
        ? t('push.ios')
        : state === 'denied'
          ? t('push.denied')
          : state === 'unconfigured'
            ? t('push.unsupported')
            : null

  const isOn = state === 'on'
  const canToggle = state === 'on' || state === 'off'

  return (
    <section className="notif">
      <div className="notif__head">
        <span className="notif__icon" aria-hidden="true">
          🔔
        </span>
        <div>
          <strong className="notif__title">{t('push.title')}</strong>
          <p className="notif__desc">{t('push.desc')}</p>
        </div>
      </div>

      {canToggle ? (
        <button
          className={`btn ${isOn ? '' : 'btn--accent'} notif__btn`}
          onClick={toggle}
          disabled={busy}
        >
          {busy ? t('push.working') : isOn ? t('push.disable') : t('push.enable')}
        </button>
      ) : (
        <p className="notif__note">{note}</p>
      )}
      {error && canToggle && <p className="notif__note notif__note--err">{error}</p>}
    </section>
  )
}
