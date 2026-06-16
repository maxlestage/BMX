// Upload d'une photo de profil : sélection → redimensionnement → upload →
// mise à jour du profil. L'avatar se répercute partout (auth.refresh()).
import { useRef, useState } from 'react'
import { api, ApiError, type User } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { resizeImage } from '../lib/image'
import { Avatar } from './Avatar'

export function AvatarEditor({ user }: { user: User }) {
  const { refresh } = useAuth()
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permet de re-choisir le même fichier
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const resized = await resizeImage(file)
      const media = await api.uploadMedia(resized)
      await api.updateMe({ avatar_url: media.url })
      await refresh() // rafraîchit l'utilisateur courant → avatar à jour partout
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('avatar.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="avatar-edit">
      <button
        className="avatar-edit__pic"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={t('avatar.change')}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <Avatar url={user.avatar_url} name={user.display_name} size={72} />
        <span className="avatar-edit__cam" aria-hidden="true">
          📷
        </span>
      </button>
      <div className="avatar-edit__info">
        <button className="avatar-edit__btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? t('avatar.uploading') : t('avatar.change')}
        </button>
        {error && <p className="avatar-edit__err">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
    </div>
  )
}
