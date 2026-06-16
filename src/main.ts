import { createApp } from 'vue'
import './index.css'
import './App.css'
import './components/community/community.css'
import './components/pages/pages.css'
import './components/admin/admin.css'
import App from './App.vue'
import { initI18n } from './i18n'
import { initAuth } from './auth'
import { initUI } from './ui'

initI18n()
initAuth()
initUI()

createApp(App).mount('#app')

// Service worker — prod uniquement, pour éviter les caches rances en dev.
if (
  'serviceWorker' in navigator &&
  location.hostname !== 'localhost' &&
  location.hostname !== '127.0.0.1'
) {
  window.addEventListener('load', () => {
    // Chemin relatif : résolu d'après l'URL du document → marche à la racine
    // comme sous un sous-chemin (/BMX/).
    const swUrl = new URL('sw.js', document.baseURI)
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* Silencieux — le site fonctionne sans service worker. */
    })
  })
}
