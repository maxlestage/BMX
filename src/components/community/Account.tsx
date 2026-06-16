// Panneau compte : connexion / inscription, ou résumé du profil connecté.

import { useEffect, useState } from 'react'
import { useAuth } from '../../auth'
import { api, ApiError, type Stats } from '../../api'
import { useI18n } from '../../i18n'
import { AvatarEditor } from '../AvatarEditor'

export function Account() {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  if (user) {
    return (
      <div className="account account--in">
        <AvatarEditor user={user} />
        <div className="account__top">
          <div>
            <span className="account__hi">
              {t('account.hi').replace('{name}', user.display_name)}
              {user.is_premium && <span className="badge-premium">✦ bmx+</span>}
            </span>
            <span className="account__handle">@{user.username}</span>
          </div>
          <button className="btn btn--ghost" onClick={logout}>
            {t('account.logout')}
          </button>
        </div>
        {user.role === 'admin' && (
          <a className="btn btn--ghost account__admin-link" href="#admin">
            ⚙️ Tableau de bord admin
          </a>
        )}
        <Premium isPremium={user.is_premium} />
      </div>
    )
  }
  return <AuthForm />
}

function Premium({ isPremium }: { isPremium: boolean }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  const perks = [
    t('premium.perk.hd'),
    t('premium.perk.fx'),
    t('premium.perk.badge'),
    t('premium.perk.noads'),
  ]

  useEffect(() => {
    if (isPremium) api.myStats().then(setStats).catch(() => setStats(null))
  }, [isPremium])

  async function go(kind: 'checkout' | 'portal') {
    setBusy(true)
    setError(null)
    try {
      const { url } = kind === 'checkout' ? await api.checkout() : await api.portal()
      window.location.href = url
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('premium.error'))
      setBusy(false)
    }
  }

  if (isPremium) {
    return (
      <div className="premium premium--active">
        <div className="premium__row">
          <span>{t('premium.active')}</span>
          <button className="btn btn--ghost" disabled={busy} onClick={() => go('portal')}>
            {busy ? '…' : t('premium.manage')}
          </button>
        </div>
        {stats && (
          <div className="stats">
            <div className="stats__item">
              <strong>{stats.parts_count}</strong>
              <span>{t('premium.stats.parts')}</span>
            </div>
            <div className="stats__item">
              <strong>{stats.total_likes}</strong>
              <span>{t('premium.stats.likes')}</span>
            </div>
            <div className="stats__item">
              <strong>{stats.total_views}</strong>
              <span>{t('premium.stats.views')}</span>
            </div>
          </div>
        )}
        {error && <p className="account__error">{error}</p>}
      </div>
    )
  }
  return (
    <div className="premium">
      <p className="premium__title">{t('premium.title')}</p>
      <ul className="premium__perks">
        {perks.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <button className="btn btn--accent" disabled={busy} onClick={() => go('checkout')}>
        {busy ? '…' : t('premium.go')}
      </button>
      {error && <p className="account__error">{error}</p>}
    </div>
  )
}

function AuthForm() {
  const { login, register } = useAuth()
  const { t } = useI18n()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register({ email, username, display_name: displayName, password })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('account.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="account account--form" onSubmit={submit}>
      <div className="account__tabs">
        <button
          type="button"
          className={mode === 'login' ? 'is-active' : ''}
          onClick={() => setMode('login')}
        >
          {t('account.tab.login')}
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'is-active' : ''}
          onClick={() => setMode('register')}
        >
          {t('account.tab.register')}
        </button>
      </div>

      {mode === 'register' && (
        <>
          <label className="account__field">
            <span>{t('account.username')}</span>
            <input
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="account__field">
            <span>{t('account.displayName')}</span>
            <input
              className="field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>
        </>
      )}
      <label className="account__field">
        <span>{t('account.email')}</span>
        <input
          className="field"
          type="email"
          placeholder="ton@email.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label className="account__field">
        <span>{mode === 'register' ? t('account.passwordNew') : t('account.password')}</span>
        <input
          className="field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          required
        />
      </label>

      {error && <p className="account__error">{error}</p>}

      <button className="btn btn--accent" disabled={busy}>
        {busy ? '…' : mode === 'login' ? t('account.login') : t('account.register')}
      </button>
    </form>
  )
}
