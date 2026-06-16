// Contexte UI global : ouvrir la fiche profil d'un membre, ou pré-remplir une
// conversation (partage de spot). Évite de faire remonter des props partout.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken } from './api'

interface UIState {
  // Fiche profil ouverte (id utilisateur) ou null.
  profileId: number | null
  openProfile: (id: number) => void
  closeProfile: () => void
  // Brouillon de message (corps pré-rempli + destinataire optionnel), déclenché
  // par « partager un spot » ou « envoyer un message » depuis un profil.
  draft: { recipientId?: number; body: string } | null
  shareToMessages: (body: string, recipientId?: number) => void
  consumeDraft: () => { recipientId?: number; body: string } | null
  // Onglet à activer (pour la navigation programmatique).
  navTab: string | null
  goTab: (tab: string) => void
  consumeNav: () => string | null
  // Nombre de messages non lus (badge onglet 💬 / cloche).
  unread: number
  refreshUnread: () => void
}

const UIContext = createContext<UIState | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileId] = useState<number | null>(null)
  const [draft, setDraft] = useState<{ recipientId?: number; body: string } | null>(null)
  const [navTab, setNavTab] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

  const refreshUnread = () => {
    if (!getToken()) {
      setUnread(0)
      return
    }
    api
      .unreadCount()
      .then((r) => setUnread(r.count))
      .catch(() => {})
  }

  // Sondage léger des non-lus (au montage puis toutes les 20 s).
  useEffect(() => {
    refreshUnread()
    const id = setInterval(refreshUnread, 20000)
    return () => clearInterval(id)
  }, [])

  const value: UIState = {
    profileId,
    openProfile: setProfileId,
    closeProfile: () => setProfileId(null),
    draft,
    shareToMessages: (body, recipientId) => {
      setDraft({ body, recipientId })
      setNavTab('messages')
    },
    consumeDraft: () => {
      const d = draft
      setDraft(null)
      return d
    },
    navTab,
    goTab: setNavTab,
    consumeNav: () => {
      const t = navTab
      setNavTab(null)
      return t
    },
    unread,
    refreshUnread,
  }

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI(): UIState {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI doit être utilisé dans <UIProvider>')
  return ctx
}
