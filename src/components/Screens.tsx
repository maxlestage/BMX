// Écrans de l'app (hors page d'accueil). Réutilise les sous-vues communauté
// dans une mise en page « écran » avec titre, sous le shell à onglets.
import { useI18n } from '../i18n'
import { Account } from './community/Account'
import { Parts } from './community/Parts'
import { Videos } from './community/Videos'
import { Riders } from './community/Riders'
import { useState } from 'react'
import { Spots } from './community/Spots'
import { Marketplace } from './community/Marketplace'
import { Sessions } from './community/Sessions'
import { Shops } from './community/Shops'
import { Stories } from './Stories'
import { SearchBar } from './SearchBar'
import { SearchResults } from './SearchResults'
import { Messages } from './Messages'
import { NotificationToggle } from './NotificationToggle'

function Screen({
  title,
  sub,
  children,
}: {
  title: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <section className="screen">
      <header className="screen__head">
        <h1 className="screen__title">{title}</h1>
        {sub && <p className="screen__sub">{sub}</p>}
      </header>
      {children}
    </section>
  )
}

export function CrewScreen() {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  return (
    <Screen title={t('crew.title')} sub={t('crew.sub')}>
      <SearchBar onSearch={setQuery} />
      <SearchResults query={query} />
      {!query.trim() && (
        <>
          <Account />
          <Stories />
          <Parts />
        </>
      )}
    </Screen>
  )
}

export function VideosScreen() {
  const { t } = useI18n()
  return (
    <Screen title={t('crew.tab.videos')}>
      <Videos />
    </Screen>
  )
}

export function RidersScreen() {
  const { t } = useI18n()
  return (
    <Screen title={t('crew.tab.riders')}>
      <Riders />
    </Screen>
  )
}

/** Spots / Sessions / Shops : la carte et tout ce qui se passe autour. */
export function SpotsScreen() {
  const { t } = useI18n()
  const [sub, setSub] = useState<'map' | 'sessions' | 'shops'>('map')
  const SUBS = [
    { id: 'map', key: 'spots.tab.map' },
    { id: 'sessions', key: 'spots.tab.sessions' },
    { id: 'shops', key: 'spots.tab.shops' },
  ] as const
  return (
    <Screen title={t('crew.tab.spots')}>
      <div className="subtabs" role="tablist">
        {SUBS.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={sub === s.id}
            className={`subtabs__item ${sub === s.id ? 'is-active' : ''}`}
            onClick={() => setSub(s.id)}
          >
            {t(s.key)}
          </button>
        ))}
      </div>
      {sub === 'map' && <Spots />}
      {sub === 'sessions' && <Sessions />}
      {sub === 'shops' && <Shops />}
    </Screen>
  )
}

export function MarketScreen() {
  const { t } = useI18n()
  return (
    <Screen title={t('market.title')} sub={t('market.sub')}>
      <Marketplace />
    </Screen>
  )
}

export function MessagesScreen() {
  const { t } = useI18n()
  return (
    <Screen title={t('tab.messages')}>
      <Messages />
    </Screen>
  )
}

export function ProfileScreen() {
  const { t } = useI18n()
  return (
    <Screen title={t('tab.profile')}>
      <Account />
      <NotificationToggle />
      <Riders />
    </Screen>
  )
}
