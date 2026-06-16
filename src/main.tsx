import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker — prod uniquement, pour éviter les caches rances en dev.
if (
  'serviceWorker' in navigator &&
  location.hostname !== 'localhost' &&
  location.hostname !== '127.0.0.1'
) {
  window.addEventListener('load', () => {
    // Chemin relatif : résolu d'après l'URL du document → marche à la racine
    // comme sous un sous-chemin GitHub Pages (/BMX/). Le scope par défaut
    // est alors le dossier du worker, ce qui couvre toute l'app.
    const swUrl = new URL('sw.js', document.baseURI)
    navigator.serviceWorker.register(swUrl).catch(() => {
      // Silencieux — le site fonctionne sans service worker.
    })
  })
}
