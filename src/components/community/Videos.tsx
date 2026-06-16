// Dernières vidéos Thrasher (flux YouTube). Miniature → lecture en embed au clic.

import { useEffect, useState } from 'react'
import { api, ApiError, type Video } from '../../api'
import { useI18n } from '../../i18n'

const PAGE = 7

export function Videos() {
  const { t } = useI18n()
  const [videos, setVideos] = useState<Video[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)

  function timeAgo(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso).getTime()
    if (Number.isNaN(d)) return ''
    const days = Math.floor((Date.now() - d) / 86_400_000)
    if (days <= 0) return t('time.today')
    if (days === 1) return t('time.yesterday')
    if (days < 30) return t('time.days').replace('{n}', String(days))
    if (days < 365) return t('time.months').replace('{n}', String(Math.floor(days / 30)))
    return t('time.years').replace('{n}', String(Math.floor(days / 365)))
  }

  useEffect(() => {
    api
      .videos()
      .then(setVideos)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('videos.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) return <p className="crew__empty">{error}</p>
  if (!videos) return <p className="crew__empty">{t('videos.loading')}</p>
  if (videos.length === 0) return <p className="crew__empty">{t('videos.empty')}</p>

  return (
    <div className="videos">
      <p className="videos__src">{t('videos.source')}</p>
      <div className="videos__grid">
        {videos.slice(0, limit).map((v) => (
          <article className="video" key={v.id}>
            <div className="video__frame">
              {playing === v.external_id ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${v.external_id}?autoplay=1`}
                  title={v.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  className="video__thumb"
                  onClick={() => setPlaying(v.external_id)}
                  aria-label={t('videos.play').replace('{title}', v.title)}
                >
                  {v.thumbnail_url && <img src={v.thumbnail_url} alt="" loading="lazy" />}
                  <span className="video__play">▶</span>
                </button>
              )}
            </div>
            <div className="video__meta">
              <h3 className="video__title">
                <a href={v.url} target="_blank" rel="noopener noreferrer">
                  {v.title}
                </a>
              </h3>
              <span className="video__date">{timeAgo(v.published_at)}</span>
            </div>
          </article>
        ))}
      </div>
      {videos.length > limit && (
        <button className="btn btn--ghost riders__more" onClick={() => setLimit((l) => l + PAGE)}>
          {t('riders.more').replace('{n}', String(videos.length - limit))}
        </button>
      )}
    </div>
  )
}
