// Tableau de bord admin — accessible via /admin (ou #admin).
// Réservé aux comptes dont le rôle est « admin » : vue d'ensemble chiffrée.

import { useEffect, useState } from 'react'
import { useAuth } from '../../auth'
import { api, type AdminStats } from '../../api'
import './admin.css'

/** Renvoie à l'accueil (efface le hash/chemin admin). */
function goHome() {
  window.location.hash = ''
  window.history.replaceState({}, '', window.location.pathname.replace(/\/admin\/?$/, '/'))
  // Recharge l'état d'écran de l'app.
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

interface Metric {
  key: keyof AdminStats
  label: string
  icon: string
  hint?: (s: AdminStats) => string | undefined
}

const METRICS: Metric[] = [
  { key: 'users', label: 'Membres', icon: '🚲', hint: (s) => `dont ${s.admins} admin${s.admins > 1 ? 's' : ''}` },
  { key: 'parts', label: 'Parts', icon: '🎞️' },
  { key: 'spots', label: 'Spots', icon: '📍', hint: (s) => (s.spots_pending > 0 ? `${s.spots_pending} en attente` : 'tous validés') },
  { key: 'messages', label: 'Messages', icon: '✉️' },
  { key: 'polls', label: 'Sondages', icon: '📊' },
  { key: 'riders', label: 'Riders', icon: '⭐' },
  { key: 'videos', label: 'Vidéos', icon: '📺' },
]

export function AdminDashboard() {
  const { user, ready } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!ready || !isAdmin) return
    setLoading(true)
    setError(null)
    api
      .adminStats()
      .then(setStats)
      .catch((e) => setError(e?.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false))
  }, [ready, isAdmin])

  // Garde-fous d'accès.
  if (!ready) {
    return (
      <section className="admin">
        <p className="admin__muted">…</p>
      </section>
    )
  }
  if (!user) {
    return (
      <section className="admin admin--gate">
        <h1 className="admin__title">Espace admin</h1>
        <p className="admin__muted">Connecte-toi avec un compte administrateur pour accéder à cette page.</p>
        <button className="btn btn--accent" onClick={goHome}>
          ← Retour à l'app
        </button>
      </section>
    )
  }
  if (!isAdmin) {
    return (
      <section className="admin admin--gate">
        <h1 className="admin__title">Accès réservé</h1>
        <p className="admin__muted">
          Ce compte ({user.display_name}) n'a pas les droits administrateur.
        </p>
        <button className="btn btn--accent" onClick={goHome}>
          ← Retour à l'app
        </button>
      </section>
    )
  }

  return (
    <section className="admin">
      <header className="admin__head">
        <div>
          <p className="admin__kicker">Tableau de bord</p>
          <h1 className="admin__title">Admin · bmx</h1>
        </div>
        <button className="btn btn--ghost" onClick={goHome}>
          ← App
        </button>
      </header>

      {error && <p className="admin__error">{error}</p>}
      {loading && !stats && <p className="admin__muted">Chargement des statistiques…</p>}

      {stats && (
        <>
          <div className="admin__grid">
            {METRICS.map((m) => (
              <div className="admin__card" key={m.key}>
                <span className="admin__card-icon" aria-hidden="true">
                  {m.icon}
                </span>
                <span className="admin__card-value">{stats[m.key].toLocaleString('fr-FR')}</span>
                <span className="admin__card-label">{m.label}</span>
                {m.hint && m.hint(stats) && (
                  <span className="admin__card-hint">{m.hint(stats)}</span>
                )}
              </div>
            ))}
          </div>

          {stats.spots_pending > 0 && (
            <p className="admin__note">
              ⚠️ {stats.spots_pending} spot{stats.spots_pending > 1 ? 's' : ''} en attente de
              validation.
            </p>
          )}
        </>
      )}
    </section>
  )
}
