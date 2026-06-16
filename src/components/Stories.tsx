// Stories rondes en haut du feed : avatars du crew dans des cercles néon
// (style stiz). Alimenté par les riders importés (photo + nom).
// Au clic : visionneuse plein écran IN-APP (les stories n'avaient aucun
// gestionnaire de clic → elles « ne s'ouvraient pas »).
import { useEffect, useState } from 'react'
import { api, type Rider } from '../api'
import { useI18n } from '../i18n'

export function Stories() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [open, setOpen] = useState<Rider | null>(null)

  useEffect(() => {
    api
      .riders()
      .then((list) => setRiders(list.filter((s) => s.photo_url).slice(0, 16)))
      .catch(() => setRiders([]))
  }, [])

  if (riders.length === 0) return null

  return (
    <>
      <div className="stories" aria-label="Crew">
        {riders.map((s) => (
          <button className="story" key={s.id} title={s.name} onClick={() => setOpen(s)}>
            <span className="story__ring">
              <Avatar name={s.name} url={s.photo_url} />
            </span>
            <span className="story__name">{firstName(s.name)}</span>
          </button>
        ))}
      </div>
      {open && <StoryViewer rider={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function StoryViewer({ rider, onClose }: { rider: Rider; onClose: () => void }) {
  const { t } = useI18n()
  const instagram = rider.instagram
    ? `https://instagram.com/${rider.instagram.replace(/^@/, '')}`
    : null
  const rating = Number(rider.avg_rating) > 0 ? rider.avg_rating : null

  return (
    <div className="story-viewer" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="story-viewer__card" onClick={(e) => e.stopPropagation()}>
        <button className="story-viewer__close" onClick={onClose} aria-label={t('story.close')}>
          ×
        </button>
        {rider.photo_url ? (
          <img className="story-viewer__img" src={rider.photo_url} alt={rider.name} />
        ) : (
          <div className="story-viewer__img story-viewer__img--ph" aria-hidden="true" />
        )}
        <div className="story-viewer__info">
          <strong className="story-viewer__name">{rider.name}</strong>
          <span className="story-viewer__sub">
            {rider.country ? `${rider.country}` : ''}
            {rider.country && rating ? ' · ' : ''}
            {rating ? `★ ${rating}/10` : ''}
          </span>
          {instagram && (
            <a
              className="btn btn--solid story-viewer__link"
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('story.instagram')}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function firstName(name: string): string {
  return name.split(' ')[0]
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false)
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  if (!url || failed) {
    return <span className="story__ph">{initials}</span>
  }
  return <img className="story__img" src={url} alt={name} loading="lazy" onError={() => setFailed(true)} />
}
