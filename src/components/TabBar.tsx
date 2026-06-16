// Barre d'onglets fixe en bas — donne l'allure d'une app native.
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { useUI } from '../ui'
import { Avatar } from './Avatar'

export type Tab = 'home' | 'crew' | 'videos' | 'spots' | 'market' | 'messages' | 'profile'

const TABS: { id: Tab; key: string; icon: string }[] = [
  { id: 'home', key: 'tab.home', icon: '🏠' },
  { id: 'crew', key: 'tab.crew', icon: '🚲' },
  { id: 'videos', key: 'tab.videos', icon: '🎬' },
  { id: 'spots', key: 'crew.tab.spots', icon: '📍' },
  { id: 'market', key: 'tab.market', icon: '🛒' },
  { id: 'messages', key: 'tab.messages', icon: '💬' },
  { id: 'profile', key: 'tab.profile', icon: '👤' },
]

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const { t } = useI18n()
  const { unread } = useUI()
  const { user } = useAuth()
  return (
    <nav className="tabbar" aria-label={t('tab.bar')}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tabbar__item ${active === tab.id ? 'is-active' : ''}`}
          aria-current={active === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          <span className="tabbar__icon" aria-hidden="true">
            {tab.id === 'profile' && user ? (
              <Avatar url={user.avatar_url} name={user.display_name} size={24} bare />
            ) : (
              tab.icon
            )}
            {tab.id === 'messages' && unread > 0 && (
              <span className="tabbar__badge">{unread > 9 ? '9+' : unread}</span>
            )}
          </span>
          <span className="tabbar__label">{t(tab.key)}</span>
        </button>
      ))}
    </nav>
  )
}
