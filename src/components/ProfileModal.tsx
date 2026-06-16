// Fiche profil d'un membre (modale) : photo, nom, stats, bouton « message ».
import { useEffect, useState } from 'react'
import { api, type User } from '../api'
import { useAuth } from '../auth'
import { useUI } from '../ui'
import { useI18n } from '../i18n'
import { Avatar } from './Avatar'

interface Profile {
  user: User
  parts_count: number
  total_likes: number
  total_views: number
}

export function ProfileModal() {
  const { profileId, closeProfile, shareToMessages } = useUI()
  const { user } = useAuth()
  const { t } = useI18n()
  const [data, setData] = useState<Profile | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (profileId == null) return
    setData(null)
    setError(false)
    api
      .profile(profileId)
      .then(setData)
      .catch(() => setError(true))
  }, [profileId])

  if (profileId == null) return null

  const isMe = user?.id === profileId

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={closeProfile}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" aria-label={t('msg.back')} onClick={closeProfile}>
          ×
        </button>

        {error && <p className="crew__empty">{t('profile.error')}</p>}
        {!data && !error && <p className="crew__empty">{t('msg.loading')}</p>}

        {data && (
          <>
            <div className="profile-card">
              <Avatar
                url={data.user.avatar_url}
                name={data.user.display_name}
                size={88}
                className="profile-card__av"
              />
              <h2 className="profile-card__name">
                {data.user.display_name}
                {data.user.is_premium && <span className="badge-premium">✦</span>}
              </h2>
              <p className="profile-card__handle">@{data.user.username}</p>
              {data.user.city && <p className="profile-card__city">📍 {data.user.city}</p>}
            </div>

            <div className="stats">
              <div className="stats__item">
                <strong>{data.parts_count}</strong>
                <span>{t('premium.stats.parts')}</span>
              </div>
              <div className="stats__item">
                <strong>{data.total_likes}</strong>
                <span>{t('premium.stats.likes')}</span>
              </div>
              <div className="stats__item">
                <strong>{data.total_views}</strong>
                <span>{t('premium.stats.views')}</span>
              </div>
            </div>

            {!isMe && user && (
              <button
                className="btn btn--accent profile-card__msg"
                onClick={() => {
                  closeProfile()
                  shareToMessages('', profileId)
                }}
              >
                💬 {t('profile.message')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
