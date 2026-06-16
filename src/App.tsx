import { useEffect, useState } from 'react'
import './App.css'
import { I18nProvider, useI18n } from './i18n'
import { AuthProvider, useAuth } from './auth'
import { UIProvider, useUI } from './ui'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Manifesto } from './components/Manifesto'
import { Reasons } from './components/Reasons'
import { Tricks } from './components/Tricks'
import { Community } from './components/Community'
import { Join } from './components/Join'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { InstallPrompt } from './components/InstallPrompt'
import { TabBar, type Tab } from './components/TabBar'
import { ProfileModal } from './components/ProfileModal'
import { About } from './components/pages/About'
import { Press } from './components/pages/Press'
import { Legal } from './components/pages/Legal'
import { AdminDashboard } from './components/admin/AdminDashboard'
import {
  CrewScreen,
  VideosScreen,
  SpotsScreen,
  MarketScreen,
  MessagesScreen,
  ProfileScreen,
} from './components/Screens'

// Pages statiques (footer) — routées par hash `#page=<nom>[:section]`.
const STATIC_PAGES = ['about', 'press', 'legal'] as const
type StaticPage = (typeof STATIC_PAGES)[number]

function parseRoute(): { page: StaticPage | null; section?: string; admin: boolean } {
  const h = window.location.hash
  // Vue admin : chemin réel /admin (via 404.html sur GitHub Pages) ou hash #admin.
  const path = window.location.pathname.replace(/\/+$/, '')
  if (h === '#admin' || path.endsWith('/admin')) {
    return { page: null, admin: true }
  }
  if (h.startsWith('#page=')) {
    const [name, section] = h.slice('#page='.length).split(':')
    if ((STATIC_PAGES as readonly string[]).includes(name)) {
      return { page: name as StaticPage, section, admin: false }
    }
  }
  return { page: null, admin: false }
}

/** Au retour de Stripe (?upgraded=1) : rafraîchit le statut et nettoie l'URL. */
function BillingReturn() {
  const { refresh } = useAuth()
  useEffect(() => {
    const u = new URL(window.location.href)
    if (u.searchParams.get('upgraded')) {
      setTimeout(() => refresh(), 1500)
      u.searchParams.delete('upgraded')
      window.history.replaceState({}, '', u.pathname + u.search + u.hash)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function SkipLink() {
  const { t } = useI18n()
  return (
    <a className="skip-link" href="#manifeste">
      {t('a11y.skip')}
    </a>
  )
}

/** Page d'accueil (landing scrollable) — l'onglet "home". */
function Home() {
  return (
    <main>
      <Hero />
      <Manifesto />
      <Reasons />
      <Tricks />
      <Community />
      <Join />
      <Contact />
    </main>
  )
}

const TABS: Tab[] = ['home', 'crew', 'videos', 'spots', 'market', 'messages', 'profile']

function Shell() {
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.replace('#tab=', '') as Tab
    return TABS.includes(h) ? h : 'home'
  })
  const [route, setRoute] = useState(parseRoute)

  // Synchronise l'onglet / la page statique avec le hash (retour arrière).
  useEffect(() => {
    const onHash = () => {
      const r = parseRoute()
      setRoute(r)
      if (r.page || r.admin) return
      const h = window.location.hash.replace('#tab=', '') as Tab
      if (TABS.includes(h)) setTab(h)
      else if (!window.location.hash) setTab('home')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Remonte en haut à chaque changement d'écran ou de page.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, route.page, route.admin])

  // Navigation programmatique (partage de spot / message depuis profil).
  const { consumeNav } = useUI()
  useEffect(() => {
    const want = consumeNav()
    if (want && TABS.includes(want as Tab)) go(want as Tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  function go(t: Tab) {
    setTab(t)
    // Les ancres internes (#manifeste…) restent gérées par la landing ;
    // on n'écrit le hash que pour les onglets non-home.
    if (t === 'home') history.replaceState({}, '', window.location.pathname)
    else window.location.hash = `tab=${t}`
  }

  const { page, section, admin } = route

  return (
    <div className="app">
      <Nav />
      <div className="app__view">
        {admin ? (
          <AdminDashboard />
        ) : page === 'about' ? (
          <About />
        ) : page === 'press' ? (
          <Press />
        ) : page === 'legal' ? (
          <Legal section={section} />
        ) : (
          <>
            {tab === 'home' && <Home />}
            {tab === 'crew' && <CrewScreen />}
            {tab === 'videos' && <VideosScreen />}
            {tab === 'spots' && <SpotsScreen />}
            {tab === 'market' && <MarketScreen />}
            {tab === 'messages' && <MessagesScreen />}
            {tab === 'profile' && <ProfileScreen />}
          </>
        )}
      </div>
      {!admin && (page || tab === 'home') && <Footer />}
      {!admin && !page && <TabBar active={tab} onChange={go} />}
      <InstallPrompt />
      <ProfileModal />
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <UIProvider>
          <BillingReturn />
          <SkipLink />
          <Shell />
        </UIProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
