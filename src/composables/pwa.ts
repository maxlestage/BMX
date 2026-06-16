import { onMounted, onUnmounted, ref } from 'vue'

/** Événement `beforeinstallprompt` (non typé par lib.dom standard). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Gère l'installation de la PWA :
 *  - capte `beforeinstallprompt` (Android / Chromium) pour proposer un bouton ;
 *  - détecte iOS (pas d'API d'install) pour afficher des instructions ;
 *  - détecte le mode standalone pour se taire une fois installée.
 */
export function usePwaInstall() {
  const deferred = ref<BeforeInstallPromptEvent | null>(null)
  const canInstall = ref(false)
  const installed = ref(false)

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true)

  const isIos =
    typeof window !== 'undefined' &&
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !(window.navigator as unknown as { standalone?: boolean }).standalone

  const onPrompt = (e: Event) => {
    e.preventDefault()
    deferred.value = e as BeforeInstallPromptEvent
    canInstall.value = true
  }
  const onInstalled = () => {
    installed.value = true
    canInstall.value = false
    deferred.value = null
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
  })
  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onPrompt)
    window.removeEventListener('appinstalled', onInstalled)
  })

  const promptInstall = async () => {
    const evt = deferred.value
    if (!evt) return
    await evt.prompt()
    const choice = await evt.userChoice
    if (choice.outcome === 'accepted') installed.value = true
    canInstall.value = false
    deferred.value = null
  }

  return { canInstall, installed, isIos, isStandalone, promptInstall }
}

/**
 * Ajoute la classe `is-visible` quand l'élément entre dans le viewport.
 * Usage : const { el, visible } = useReveal()  →  <section ref="el" :class="{'is-visible': visible}">
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const el = ref<T | null>(null)
  const visible = ref(false)

  onMounted(() => {
    const node = el.value
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      visible.value = true
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.value = true
            obs.disconnect()
          }
        }
      },
      { threshold: 0.18 },
    )
    obs.observe(node)
    onUnmounted(() => obs.disconnect())
  })

  return { el, visible }
}
