import { useEffect, useRef, useState } from 'react'

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
  const deferred = useRef<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(false)

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true)

  const isIos =
    typeof window !== 'undefined' &&
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !(window.navigator as unknown as { standalone?: boolean }).standalone

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      deferred.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    const onInstalled = () => {
      setInstalled(true)
      setCanInstall(false)
      deferred.current = null
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async () => {
    const evt = deferred.current
    if (!evt) return
    await evt.prompt()
    const choice = await evt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setCanInstall(false)
    deferred.current = null
  }

  return { canInstall, installed, isIos, isStandalone, promptInstall }
}

/**
 * Ajoute la classe `is-visible` quand l'élément entre dans le viewport.
 * Utilisé pour les animations d'apparition au scroll.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            obs.disconnect()
          }
        }
      },
      { threshold: 0.18 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return { ref, visible }
}
