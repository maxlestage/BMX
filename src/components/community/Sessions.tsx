// Sessions de bmx : rendez-vous proposés par les membres (spot ou ville),
// avec inscription en un clic.

import { useEffect, useState } from 'react'
import { api, ApiError, type BMXSession } from '../../api'
import { useAuth } from '../../auth'
import { useI18n, type Lang } from '../../i18n'
import { Avatar } from '../Avatar'

const DATE_LOCALES: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  es: 'es-ES',
  de: 'de-DE',
  pt: 'pt-PT',
  zh: 'zh-CN',
  ja: 'ja-JP',
}

function fmtWhen(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(DATE_LOCALES[lang], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Sessions() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const [sessions, setSessions] = useState<BMXSession[]>([])
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .sessions()
      .then(setSessions)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('sessions.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function replace(s: BMXSession) {
    setSessions((prev) => prev.map((x) => (x.id === s.id ? s : x)))
  }

  async function toggle(s: BMXSession, joined: boolean) {
    try {
      replace(joined ? await api.leaveSession(s.id) : await api.joinSession(s.id))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('sessions.error'))
    }
  }

  return (
    <div className="sessions">
      <div className="spots__bar">
        <span className="spots__count">
          {t('sessions.count').replace('{n}', String(sessions.length))}
        </span>
        {user ? (
          <button
            className={`btn ${adding ? 'btn--ghost' : 'btn--accent'}`}
            onClick={() => setAdding((a) => !a)}
          >
            {adding ? t('sessions.cancel') : t('sessions.add')}
          </button>
        ) : (
          <span className="spots__hint">{t('sessions.guest')}</span>
        )}
      </div>

      {error && <p className="account__error">{error}</p>}

      {adding && (
        <SessionForm
          onCreated={(s) => {
            setSessions((prev) =>
              [...prev, s].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
            )
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {sessions.length === 0 && !adding && <p className="market__empty">{t('sessions.empty')}</p>}

      <ul className="sessions__list">
        {sessions.map((s) => {
          const joined = !!user && s.members.some((m) => m.id === user.id)
          return (
            <li key={s.id} className="sessions__card">
              <div className="sessions__when">{fmtWhen(s.starts_at, lang)}</div>
              <div className="sessions__body">
                <strong className="sessions__title">{s.title}</strong>
                <span className="sessions__meta">
                  {s.city ? `📍 ${s.city} · ` : ''}
                  {t('sessions.host').replace(
                    '{name}',
                    s.host.display_name ?? s.host.username ?? '—',
                  )}
                </span>
                {s.description && <p className="sessions__desc">{s.description}</p>}
                <div className="sessions__riders">
                  <span className="sessions__avatars">
                    {s.members.slice(0, 5).map((m, i) => (
                      <Avatar key={m.id ?? i} url={m.avatar_url} name={m.display_name ?? '?'} size={24} bare />
                    ))}
                  </span>
                  <span className="sessions__countlbl">
                    {t('sessions.riders').replace('{n}', String(s.members_count))}
                  </span>
                  {user && (
                    <button
                      className={`btn ${joined ? 'btn--ghost' : 'btn--accent'}`}
                      onClick={() => toggle(s, joined)}
                    >
                      {joined ? t('sessions.leave') : t('sessions.join')}
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SessionForm({
  onCreated,
  onCancel,
}: {
  onCreated: (s: BMXSession) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [city, setCity] = useState(user?.city ?? '')
  const [when, setWhen] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const date = new Date(when)
    if (Number.isNaN(date.getTime())) return
    setBusy(true)
    setError(null)
    try {
      const created = await api.createSession({
        title: title.trim(),
        city: city.trim() || undefined,
        description: description.trim() || undefined,
        starts_at: date.toISOString(),
      })
      onCreated(created)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('sessions.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="spots__form" onSubmit={submit}>
      <input
        className="field"
        placeholder={t('sessions.form.title')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <div className="market__offer-row">
        <input
          className="field"
          type="datetime-local"
          aria-label={t('sessions.form.when')}
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          required
        />
        <input
          className="field"
          placeholder={t('sessions.form.city')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>
      <textarea
        className="field"
        placeholder={t('sessions.form.description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      {error && <p className="account__error">{error}</p>}
      <div className="spots__form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('sessions.cancel')}
        </button>
        <button className="btn btn--accent" disabled={!title.trim() || !when || busy}>
          {t('sessions.form.send')}
        </button>
      </div>
    </form>
  )
}
