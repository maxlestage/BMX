// Feed des parts (vidéos courtes) + upload depuis le navigateur.

import { useEffect, useRef, useState } from 'react'
import { api, ApiError, mediaUrl, type Part, type Effects } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'

// Les parts sont bornées à 10 s et 175 Mo (validé avant l'envoi).
const MAX_SECS = 10
const MAX_MB = 175
const MAX_BYTES = MAX_MB * 1024 * 1024

/** Lit la durée réelle d'une vidéo côté client (secondes, métadonnées). */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src)
      resolve(Number.isFinite(v.duration) ? v.duration : 0)
    }
    v.onerror = () => resolve(0)
    v.src = URL.createObjectURL(file)
  })
}

export function Parts() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [parts, setParts] = useState<Part[] | null>(null)
  const [sort, setSort] = useState<'recent' | 'popular'>('recent')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setParts(null)
    api
      .parts(sort)
      .then(setParts)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('parts.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort])

  async function like(id: number) {
    try {
      const updated = await api.likePart(id)
      setParts((prev) => prev?.map((p) => (p.id === id ? updated : p)) ?? null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('parts.actionError'))
    }
  }

  return (
    <div className="parts">
      {user && <UploadPart onCreated={(p) => setParts((prev) => [p, ...(prev ?? [])])} />}

      <div className="parts__sort">
        <button className={sort === 'recent' ? 'is-active' : ''} onClick={() => setSort('recent')}>
          {t('parts.sort.recent')}
        </button>
        <button
          className={sort === 'popular' ? 'is-active' : ''}
          onClick={() => setSort('popular')}
        >
          {t('parts.sort.popular')}
        </button>
      </div>

      {error && <p className="account__error">{error}</p>}

      {!parts && <p className="crew__empty">{t('parts.loading')}</p>}
      {parts && parts.length === 0 && (
        <p className="crew__empty">{user ? t('parts.emptyUser') : t('parts.emptyGuest')}</p>
      )}

      <div className="parts__grid">
        {parts?.map((p) => (
          <article className="part" key={p.id}>
            <video
              className="part__video"
              src={mediaUrl(p.video_url)}
              poster={p.thumbnail_url ? mediaUrl(p.thumbnail_url) : undefined}
              controls
              playsInline
              preload="metadata"
            />
            <div className="part__meta">
              <h3 className="part__title">{p.title}</h3>
              <div className="part__stats">
                <button
                  className="part__like"
                  onClick={() => like(p.id)}
                  disabled={!user}
                  title={user ? t('parts.like') : t('parts.likeGuest')}
                >
                  ♥ {p.likes_count}
                </button>
                <span className="part__views">
                  {t('parts.views').replace('{n}', String(p.views_count))}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// Le label « Grain » vient du dictionnaire ; les autres sont des termes propres.
const FX: { id: keyof Effects; label: string; premium: boolean }[] = [
  { id: 'grain', label: '', premium: false },
  { id: 'vhs', label: 'VHS', premium: true },
  { id: 'fisheye', label: 'Fisheye', premium: true },
  { id: 'slowmo', label: 'Slow-mo', premium: true },
]

function UploadPart({ onCreated }: { onCreated: (p: Part) => void }) {
  const { user } = useAuth()
  const { t } = useI18n()
  const premium = !!user?.is_premium
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [fx, setFx] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function clearFile() {
    setFile(null)
    setDuration(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Validation à la sélection : ≤ 175 Mo et ≤ 10 s.
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setError(null)
    if (!f) {
      clearFile()
      return
    }
    if (f.size > MAX_BYTES) {
      setError(t('parts.upload.tooBig'))
      clearFile()
      return
    }
    const secs = await readDuration(f)
    if (secs > MAX_SECS + 0.5) {
      setError(t('parts.upload.tooLong'))
      clearFile()
      return
    }
    setFile(f)
    setDuration(secs)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError(t('parts.upload.chooseVideo'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const media = await api.uploadMedia(file)
      const anyFx = FX.some((f) => fx[f.id])
      const effects: Effects | undefined = anyFx
        ? { vhs: !!fx.vhs, fisheye: fx.fisheye ? 1 : 0, grain: fx.grain ? 1 : 0, slowmo: fx.slowmo ? 1 : 0 }
        : undefined
      const part = await api.createPart({
        title: title.trim() || file.name,
        video_media_id: media.id,
        duration_secs: Math.max(1, Math.round(duration)),
        effects,
      })
      onCreated(part)
      setTitle('')
      clearFile()
      setFx({})
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('parts.upload.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="upload" onSubmit={submit}>
      <h3 className="upload__title">{t('parts.upload.title')}</h3>
      <input
        className="field"
        placeholder={t('parts.upload.titlePlaceholder')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />
      <input
        ref={inputRef}
        className="field field--file"
        type="file"
        accept="video/*"
        onChange={onPick}
      />
      <p className="upload__limit">{t('parts.upload.limit')}</p>

      <div className="fx">
        <span className="fx__label">{t('parts.fx.label')}</span>
        <div className="fx__chips">
          {FX.map((f) => {
            const locked = f.premium && !premium
            const on = !!fx[f.id]
            return (
              <button
                type="button"
                key={f.id}
                className={`fx__chip ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
                disabled={locked}
                title={locked ? t('parts.fx.locked') : ''}
                onClick={() => setFx((s) => ({ ...s, [f.id]: !s[f.id] }))}
              >
                {f.label || t('parts.fx.grain')}
                {f.premium && ' ✦'}
              </button>
            )
          })}
        </div>
        {!premium && <p className="fx__hint">{t('parts.fx.hint')}</p>}
      </div>

      {file && <p className="upload__hint">{file.name} · {(file.size / 1_048_576).toFixed(1)} Mo</p>}
      {error && <p className="account__error">{error}</p>}
      <button className="btn btn--accent" disabled={busy || !file}>
        {busy ? t('parts.upload.sending') : t('parts.upload.publish')}
      </button>
    </form>
  )
}
