// Web Push côté client : opt-in, abonnement PushManager, synchro backend.
//
// Sur iOS, les notifications push web n'existent QUE si la PWA est installée
// sur l'écran d'accueil (Safari en onglet ne les reçoit pas). On le détecte
// pour afficher le bon message.

import { api } from '../api'

/** Le navigateur supporte-t-il le push (SW + PushManager + Notification) ? */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Probablement iOS hors mode « écran d'accueil » → push impossible. */
export function isIosNonStandalone(): boolean {
  if (typeof navigator === 'undefined') return false
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  // display-mode: standalone (PWA installée) ou navigator.standalone (iOS legacy)
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  return ios && !standalone
}

/** Décode une clé VAPID base64url en Uint8Array (applicationServerKey). */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Encode un ArrayBuffer en base64url (pour p256dh / auth). */
function arrayBufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return ''
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export type PushState =
  | 'unsupported'
  | 'ios-install' // iOS, app non installée → impossible pour l'instant
  | 'unconfigured' // backend sans clé VAPID
  | 'denied' // permission refusée
  | 'on' // abonné
  | 'off' // supporté mais pas encore abonné

/** État courant du push (sans rien déclencher). */
export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return isIosNonStandalone() ? 'ios-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    return sub ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

/**
 * Active le push : demande la permission, s'abonne avec la clé VAPID du
 * backend, puis enregistre l'abonnement. Renvoie le nouvel état.
 */
export async function enablePush(): Promise<PushState> {
  if (!isPushSupported()) return isIosNonStandalone() ? 'ios-install' : 'unsupported'

  const vapid = await api.pushVapid()
  if (!vapid.enabled || !vapid.public_key) return 'unconfigured'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.public_key) as BufferSource,
    }))

  await api.pushSubscribe({
    endpoint: sub.endpoint,
    keys: {
      p256dh: arrayBufferToBase64Url(sub.getKey('p256dh')),
      auth: arrayBufferToBase64Url(sub.getKey('auth')),
    },
  })
  return 'on'
}

/** Désactive le push : désabonne le navigateur et informe le backend. */
export async function disablePush(): Promise<PushState> {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await api.pushUnsubscribe(sub.endpoint).catch(() => {})
      await sub.unsubscribe()
    }
  } catch {
    /* ignore */
  }
  return 'off'
}
