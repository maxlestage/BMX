<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import Nav from './components/Nav.vue'
import Hero from './components/Hero.vue'
import Manifesto from './components/Manifesto.vue'
import Reasons from './components/Reasons.vue'
import Tricks from './components/Tricks.vue'
import Community from './components/Community.vue'
import Join from './components/Join.vue'
import Contact from './components/Contact.vue'
import Footer from './components/Footer.vue'
import InstallPrompt from './components/InstallPrompt.vue'
import TabBar from './components/TabBar.vue'
import ProfileModal from './components/ProfileModal.vue'
import About from './components/pages/About.vue'
import Press from './components/pages/Press.vue'
import Legal from './components/pages/Legal.vue'
import AdminDashboard from './components/admin/AdminDashboard.vue'
import CrewScreen from './components/CrewScreen.vue'
import VideosScreen from './components/VideosScreen.vue'
import SpotsScreen from './components/SpotsScreen.vue'
import MarketScreen from './components/MarketScreen.vue'
import MessagesScreen from './components/MessagesScreen.vue'
import ProfileScreen from './components/ProfileScreen.vue'
import { useI18n } from './i18n'
import { useAuth } from './auth'
import { useUI } from './ui'

type Tab = 'home' | 'crew' | 'videos' | 'spots' | 'market' | 'messages' | 'profile'
const TABS: Tab[] = ['home', 'crew', 'videos', 'spots', 'market', 'messages', 'profile']
const STATIC_PAGES = ['about', 'press', 'legal'] as const
type StaticPage = (typeof STATIC_PAGES)[number]

const { t } = useI18n()
const { refresh } = useAuth()
const { navTab, consumeNav } = useUI()

function parseRoute(): { page: StaticPage | null; section?: string; admin: boolean } {
  const h = window.location.hash
  const path = window.location.pathname.replace(/\/+$/, '')
  if (h === '#admin' || path.endsWith('/admin')) return { page: null, admin: true }
  if (h.startsWith('#page=')) {
    const [name, section] = h.slice('#page='.length).split(':')
    if ((STATIC_PAGES as readonly string[]).includes(name)) {
      return { page: name as StaticPage, section, admin: false }
    }
  }
  return { page: null, admin: false }
}

function initTab(): Tab {
  const h = window.location.hash.replace('#tab=', '') as Tab
  return TABS.includes(h) ? h : 'home'
}

const tab = ref<Tab>(initTab())
const route = ref(parseRoute())

function onHash() {
  route.value = parseRoute()
  if (route.value.page || route.value.admin) return
  const h = window.location.hash.replace('#tab=', '') as Tab
  if (TABS.includes(h)) tab.value = h
  else if (!window.location.hash) tab.value = 'home'
}

function go(tt: Tab) {
  tab.value = tt
  if (tt === 'home') history.replaceState({}, '', window.location.pathname)
  else window.location.hash = `tab=${tt}`
}

// Navigation programmatique (partage de spot / message depuis un profil).
watch(navTab, (v) => {
  if (v && TABS.includes(v as Tab)) go(consumeNav() as Tab)
})

// Remonte en haut à chaque changement d'écran ou de page.
watch(
  () => [tab.value, route.value.page, route.value.admin],
  () => window.scrollTo(0, 0),
)

onMounted(() => {
  window.addEventListener('hashchange', onHash)
  // Retour de Stripe (?upgraded=1) : rafraîchit le statut et nettoie l'URL.
  const u = new URL(window.location.href)
  if (u.searchParams.get('upgraded')) {
    setTimeout(() => refresh(), 1500)
    u.searchParams.delete('upgraded')
    window.history.replaceState({}, '', u.pathname + u.search + u.hash)
  }
})
onUnmounted(() => window.removeEventListener('hashchange', onHash))
</script>

<template>
  <a class="skip-link" href="#manifeste">{{ t('a11y.skip') }}</a>
  <div class="app">
    <Nav />
    <div class="app__view">
      <AdminDashboard v-if="route.admin" />
      <About v-else-if="route.page === 'about'" />
      <Press v-else-if="route.page === 'press'" />
      <Legal v-else-if="route.page === 'legal'" :section="route.section" />
      <template v-else>
        <main v-if="tab === 'home'">
          <Hero />
          <Manifesto />
          <Reasons />
          <Tricks />
          <Community />
          <Join />
          <Contact />
        </main>
        <CrewScreen v-else-if="tab === 'crew'" />
        <VideosScreen v-else-if="tab === 'videos'" />
        <SpotsScreen v-else-if="tab === 'spots'" />
        <MarketScreen v-else-if="tab === 'market'" />
        <MessagesScreen v-else-if="tab === 'messages'" />
        <ProfileScreen v-else-if="tab === 'profile'" />
      </template>
    </div>
    <Footer v-if="!route.admin && (route.page || tab === 'home')" />
    <TabBar v-if="!route.admin && !route.page" :active="tab" @change="go" />
    <InstallPrompt />
    <ProfileModal />
  </div>
</template>
