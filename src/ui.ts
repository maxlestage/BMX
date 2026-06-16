// UI globale — store réactif (module singleton) : fiche profil d'un membre,
// brouillon de message (partage de spot), navigation programmatique d'onglet,
// compteur de messages non lus. Usage : const ui = useUI().
import { ref, type Ref } from 'vue'
import { api, getToken } from './api'

export interface Draft {
  recipientId?: number
  body: string
}

const profileId = ref<number | null>(null)
const draft = ref<Draft | null>(null)
const navTab = ref<string | null>(null)
const unread = ref(0)

function refreshUnread() {
  if (!getToken()) {
    unread.value = 0
    return
  }
  api
    .unreadCount()
    .then((r) => (unread.value = r.count))
    .catch(() => {})
}

/** Sondage léger des non-lus (au montage puis toutes les 20 s). */
export function initUI() {
  refreshUnread()
  setInterval(refreshUnread, 20000)
}

interface UIApi {
  profileId: Ref<number | null>
  openProfile: (id: number) => void
  closeProfile: () => void
  draft: Ref<Draft | null>
  shareToMessages: (body: string, recipientId?: number) => void
  consumeDraft: () => Draft | null
  navTab: Ref<string | null>
  goTab: (tab: string) => void
  consumeNav: () => string | null
  unread: Ref<number>
  refreshUnread: () => void
}

export function useUI(): UIApi {
  return {
    profileId,
    openProfile: (id: number) => (profileId.value = id),
    closeProfile: () => (profileId.value = null),
    draft,
    shareToMessages: (body: string, recipientId?: number) => {
      draft.value = { body, recipientId }
      navTab.value = 'messages'
    },
    consumeDraft: () => {
      const d = draft.value
      draft.value = null
      return d
    },
    navTab,
    goTab: (tab: string) => (navTab.value = tab),
    consumeNav: () => {
      const t = navTab.value
      navTab.value = null
      return t
    },
    unread,
    refreshUnread,
  }
}
