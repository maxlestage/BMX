// Sondages communautaires : résultats en barres + vote (un seul par sondage).

import { useEffect, useState } from 'react'
import { api, ApiError, type PollWithOptions } from '../../api'
import { useAuth } from '../../auth'
import { useI18n } from '../../i18n'

export function Polls() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [polls, setPolls] = useState<PollWithOptions[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voted, setVoted] = useState<Record<number, boolean>>({})

  useEffect(() => {
    api
      .polls()
      .then(setPolls)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('polls.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function vote(pollId: number, optionId: number) {
    setError(null)
    try {
      const updated = await api.votePoll(pollId, optionId)
      setPolls((prev) => prev?.map((p) => (p.poll.id === pollId ? updated : p)) ?? null)
      setVoted((v) => ({ ...v, [pollId]: true }))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('polls.voteError'))
    }
  }

  if (error && !polls) return <Empty>{error}</Empty>
  if (!polls) return <Empty>{t('polls.loading')}</Empty>
  if (polls.length === 0) return <Empty>{t('polls.empty')}</Empty>

  return (
    <div className="polls">
      {error && <p className="account__error">{error}</p>}
      {polls.map(({ poll, options }) => {
        const total = options.reduce((s, o) => s + o.votes_count, 0)
        const done = voted[poll.id] || poll.closed
        return (
          <article className="poll" key={poll.id}>
            <h3 className="poll__q">{poll.question}</h3>
            <span className="poll__cat">{poll.category}</span>
            <ul className="poll__options">
              {options.map((o) => {
                const pct = total > 0 ? Math.round((o.votes_count / total) * 100) : 0
                return (
                  <li key={o.id}>
                    <button
                      className="poll__opt"
                      disabled={!user || done}
                      onClick={() => vote(poll.id, o.id)}
                      title={user ? '' : t('polls.voteGuest')}
                    >
                      <span className="poll__bar" style={{ width: done ? `${pct}%` : 0 }} />
                      <span className="poll__label">{o.label}</span>
                      {done && <span className="poll__pct">{pct}%</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
            <footer className="poll__foot">
              {t('polls.votes').replace('{n}', String(total))}
              {!user && t('polls.guestSuffix')}
            </footer>
          </article>
        )
      })}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="crew__empty">{children}</p>
}
