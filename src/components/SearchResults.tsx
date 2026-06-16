// Résultats de la recherche intelligente : charge spots/riders/vidéos et
// affiche les correspondances (parsing local de la phrase). Vide tant qu'aucune
// requête n'est saisie.
import { useEffect, useMemo, useState } from 'react'
import { api, mediaUrl, type Spot, type Rider, type Video } from '../api'
import { useI18n } from '../i18n'
import { parseQuery, filterSpots, filterRiders, filterVideos } from '../lib/search'

export function SearchResults({ query }: { query: string }) {
  const { t } = useI18n()
  const [spots, setSpots] = useState<Spot[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [videos, setVideos] = useState<Video[]>([])

  // Charge les jeux de données une fois qu'une recherche commence.
  useEffect(() => {
    if (!query.trim()) return
    if (spots.length || riders.length || videos.length) return
    api.spots().then(setSpots).catch(() => {})
    api.riders().then(setRiders).catch(() => {})
    api.videos().then(setVideos).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const parsed = useMemo(() => {
    const cities = [...new Set(spots.map((s) => s.city ?? '').filter(Boolean))]
    return parseQuery(query, cities)
  }, [query, spots])

  if (!query.trim()) return null

  const mSpots = filterSpots(spots, parsed).slice(0, 8)
  const mRiders = filterRiders(riders, parsed).slice(0, 8)
  const mVideos = filterVideos(videos, parsed).slice(0, 6)
  const total = mSpots.length + mRiders.length + mVideos.length

  return (
    <div className="results">
      <p className="results__count">
        {total} {t('search.results')}
        {parsed.city && ` · ${parsed.city}`}
        {parsed.types.length > 0 && ` · ${parsed.types.join(', ')}`}
      </p>

      {mSpots.length > 0 && (
        <section className="results__group">
          <h3 className="results__label">{t('crew.tab.spots')}</h3>
          {mSpots.map((s) => (
            <div className="results__row" key={`sp${s.id}`}>
              <span className="results__dot">📍</span>
              <div>
                <strong>{s.name}</strong>
                <span className="results__meta">
                  {s.city ? `${s.city} · ` : ''}
                  {s.spot_type}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {mRiders.length > 0 && (
        <section className="results__group">
          <h3 className="results__label">{t('crew.tab.riders')}</h3>
          {mRiders.map((s) => (
            <div className="results__row" key={`sk${s.id}`}>
              {s.photo_url ? (
                <img className="results__av" src={s.photo_url} alt="" loading="lazy" />
              ) : (
                <span className="results__dot">🏆</span>
              )}
              <div>
                <strong>{s.name}</strong>
                {s.country && <span className="results__meta">{s.country}</span>}
              </div>
            </div>
          ))}
        </section>
      )}

      {mVideos.length > 0 && (
        <section className="results__group">
          <h3 className="results__label">{t('crew.tab.videos')}</h3>
          {mVideos.map((v) => (
            <a
              className="results__row"
              key={`vi${v.id}`}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {v.thumbnail_url ? (
                <img className="results__av results__av--sq" src={mediaUrl(v.thumbnail_url)} alt="" loading="lazy" />
              ) : (
                <span className="results__dot">🎬</span>
              )}
              <div>
                <strong>{v.title}</strong>
              </div>
            </a>
          ))}
        </section>
      )}

      {total === 0 && <p className="crew__empty">{t('search.none')}</p>}
    </div>
  )
}
