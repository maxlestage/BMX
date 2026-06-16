// Classement des riders (importés de theboardr) + vote communautaire (1–10).

import { useEffect, useMemo, useState } from 'react'
import { api, ApiError, type Rider } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'

const PAGE = 7

export function Riders() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [riders, setRiders] = useState<Rider[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [voted, setVoted] = useState<Record<number, number>>({})

  useEffect(() => {
    api
      .riders()
      .then(setRiders)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('riders.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rang basé sur l'ordre renvoyé par l'API (meilleure moyenne d'abord).
  const ranked = useMemo(
    () => (riders ?? []).map((s, i) => ({ ...s, rank: i + 1 })),
    [riders],
  )
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? ranked.filter((s) => s.name.toLowerCase().includes(q)) : ranked
  }, [ranked, query])

  async function rate(id: number, score: number) {
    setError(null)
    try {
      const updated = await api.rateRider(id, score)
      setRiders((prev) => prev?.map((s) => (s.id === id ? updated : s)) ?? null)
      setVoted((v) => ({ ...v, [id]: score }))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('riders.voteError'))
    }
  }

  if (error && !riders) return <p className="crew__empty">{error}</p>
  if (!riders) return <p className="crew__empty">{t('riders.loading')}</p>

  const shown = filtered.slice(0, limit)

  return (
    <div className="riders">
      <input
        className="field riders__search"
        placeholder={t('riders.search')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setLimit(PAGE)
        }}
      />
      {error && <p className="account__error">{error}</p>}
      {!user && <p className="riders__hint">{t('riders.guest')}</p>}

      <div className="riders__grid">
        {shown.map((s) => (
          <article className="rider" key={s.id}>
            <span className="rider__rank">#{s.rank}</span>
            <RiderPhoto name={s.name} url={s.photo_url} />
            <h3 className="rider__name">{s.name}</h3>
            <div className="rider__score">
              {s.ratings_count > 0 ? (
                <>
                  <strong>{Number(s.avg_rating).toFixed(1)}</strong>
                  <span className="rider__count">
                    {t('riders.votes').replace('{n}', String(s.ratings_count))}
                  </span>
                </>
              ) : (
                <span className="rider__count">{t('riders.notRated')}</span>
              )}
            </div>
            {user && (
              <label className="rider__rate">
                {voted[s.id]
                  ? t('riders.yourRating').replace('{n}', String(voted[s.id]))
                  : t('riders.rate')}
                <select
                  value={voted[s.id] ?? ''}
                  onChange={(e) => e.target.value && rate(s.id, Number(e.target.value))}
                  aria-label={`${t('riders.rate')} ${s.name}`}
                >
                  <option value="">1–10</option>
                  {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </article>
        ))}
      </div>

      {filtered.length > limit && (
        <button className="btn btn--ghost riders__more" onClick={() => setLimit((l) => l + PAGE)}>
          {t('riders.more').replace('{n}', String(filtered.length - limit))}
        </button>
      )}
      {filtered.length === 0 && <p className="crew__empty">{t('riders.none')}</p>}
    </div>
  )
}

function RiderPhoto({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false)
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  if (!url || failed) {
    return <div className="rider__photo rider__photo--ph">{initials}</div>
  }
  return (
    <img
      className="rider__photo"
      src={url}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
