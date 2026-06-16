// Messagerie : liste des conversations, puis fil de discussion + envoi.
import { useEffect, useRef, useState } from 'react'
import { api, ApiError, type Conversation, type Message } from '../api'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { useUI } from '../ui'
import { Avatar } from './Avatar'

export function Messages() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { consumeDraft } = useUI()
  const [open, setOpen] = useState<Conversation | null>(null)
  const [draftText, setDraftText] = useState('')

  // Si on arrive avec un brouillon (partage de spot / message depuis profil),
  // ouvre directement le fil avec le destinataire et pré-remplit le texte.
  useEffect(() => {
    const d = consumeDraft()
    if (d?.recipientId != null) {
      setOpen({
        user_id: d.recipientId,
        username: null,
        display_name: null,
        avatar_url: null,
        last_body: '',
        last_at: '',
        unread: false,
      })
      setDraftText(d.body)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!user) return <p className="crew__empty">{t('msg.guest')}</p>
  if (open)
    return <Thread convo={open} initialText={draftText} onBack={() => setOpen(null)} />
  return <ConversationList onOpen={setOpen} />
}

function ConversationList({ onOpen }: { onOpen: (c: Conversation) => void }) {
  const { t } = useI18n()
  const { openProfile } = useUI()
  const [convos, setConvos] = useState<Conversation[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .conversations()
      .then(setConvos)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('msg.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) return <p className="crew__empty">{error}</p>
  if (!convos) return <p className="crew__empty">{t('msg.loading')}</p>
  if (convos.length === 0) return <p className="crew__empty">{t('msg.empty')}</p>

  return (
    <div className="convos">
      {convos.map((c) => (
        <div className="convo" key={c.user_id}>
          <button
            className="convo__av"
            onClick={() => openProfile(c.user_id)}
            aria-label={c.display_name ?? `#${c.user_id}`}
          >
            <Avatar url={c.avatar_url} name={c.display_name} size={44} />
          </button>
          <button className="convo__body" onClick={() => onOpen(c)}>
            <span className="convo__name">{c.display_name ?? `#${c.user_id}`}</span>
            <span className="convo__last">{c.last_body}</span>
          </button>
          {c.unread && <span className="convo__dot" aria-label={t('msg.unread')} />}
        </div>
      ))}
    </div>
  )
}

function Thread({
  convo,
  initialText = '',
  onBack,
}: {
  convo: Conversation
  initialText?: string
  onBack: () => void
}) {
  const { user } = useAuth()
  const { t } = useI18n()
  const { refreshUnread } = useUI()
  const [msgs, setMsgs] = useState<Message[]>([])
  const [text, setText] = useState(initialText)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Charge le nom de l'interlocuteur s'il n'est pas connu (cas brouillon).
  useEffect(() => {
    if (convo.display_name) return
    api
      .profile(convo.user_id)
      .then((p) => setName(p.user.display_name))
      .catch(() => {})
  }, [convo.user_id, convo.display_name])

  async function load() {
    try {
      setMsgs(await api.thread(convo.user_id))
      refreshUnread() // le fil vient d'être marqué comme lu côté serveur
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5000) // rafraîchit le fil toutes les 5 s
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convo.user_id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setBusy(true)
    try {
      const m = await api.sendMessage(convo.user_id, body)
      setMsgs((prev) => [...prev, m])
      setText('')
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="thread">
      <header className="thread__head">
        <button className="thread__back" onClick={onBack} aria-label={t('msg.back')}>
          ‹
        </button>
        <strong>{convo.display_name ?? name ?? `#${convo.user_id}`}</strong>
      </header>

      <div className="thread__list">
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.sender_id === user!.id ? 'bubble--me' : ''}`}
          >
            {m.body}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="thread__form" onSubmit={send}>
        <input
          className="field"
          placeholder={t('msg.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn--accent" disabled={busy || !text.trim()}>
          {t('msg.send')}
        </button>
      </form>
    </div>
  )
}
