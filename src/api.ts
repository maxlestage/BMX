// Client API bmx — typé, avec gestion du token JWT.
//
// L'URL de base est injectée au build (Vite) via VITE_BMX_API_URL.
// En dev/local on retombe sur le backend Rust local. Les lectures (parts,
// spots, sondages) sont publiques ; les écritures exigent un Bearer token.

const RAW_BASE = (import.meta.env.VITE_BMX_API_URL as string | undefined) || ''

// URL d'API par défaut selon le contexte :
//   - en prod (site servi sur un vrai domaine) → API Heroku
//   - en local (localhost / 127.0.0.1) → backend Rust de dev
// Surchargeable au build via BMX_API_URL.
function defaultBase(): string {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname
    if (h && h !== 'localhost' && h !== '127.0.0.1') {
      return 'https://bmx-project-dc34db4d452d.herokuapp.com/api/v1'
    }
  }
  return 'http://localhost:8080/api/v1'
}
export const API_BASE = (RAW_BASE && RAW_BASE.trim()) || defaultBase()
// Origine sans le suffixe /api/v1 — pour préfixer les URLs média relatives.
export const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')

/** Résout une URL média : absolue → telle quelle ; relative → préfixée. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

// ---------------------------------------------------------------- Types

export interface User {
  id: number
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  stance: string
  instagram: string | null
  city: string | null
  role: string
  is_premium: boolean
  premium_until: string | null
}

export interface TokenResponse {
  token: string
  user: User
}

export interface Part {
  id: number
  user_id: number
  title: string
  video_url: string
  thumbnail_url: string | null
  sound_id: number | null
  effects: Record<string, unknown>
  duration_secs: number
  likes_count: number
  views_count: number
  created_at: string
  updated_at: string
}

export interface Spot {
  id: number
  name: string
  description: string | null
  latitude: number
  longitude: number
  city: string | null
  spot_type: string
  photo_url: string | null
  photos: string[]
  submitted_by: number | null
  approved: boolean
  created_at: string
  updated_at: string
}

export interface PollOption {
  id: number
  poll_id: number
  label: string
  votes_count: number
  position: number
}

export interface Poll {
  id: number
  question: string
  category: string
  closed: boolean
  votes_count: number
  created_at: string
  updated_at: string
}

export interface PollWithOptions {
  poll: Poll
  options: PollOption[]
}

export interface Rider {
  id: number
  name: string
  source: string
  external_id: string | null
  country: string | null
  photo_url: string | null
  instagram: string | null
  bio: string | null
  /** Décimal sérialisé en chaîne (ex. "8.50"). */
  avg_rating: string
  ratings_count: number
}

export interface Video {
  id: number
  source: string
  external_id: string
  title: string
  url: string
  thumbnail_url: string | null
  author: string | null
  published_at: string | null
  created_at: string
}

export interface Conversation {
  user_id: number
  username: string | null
  display_name: string | null
  avatar_url: string | null
  last_body: string
  last_at: string
  unread: boolean
}

export interface Message {
  id: number
  sender_id: number
  recipient_id: number
  body: string
  read: boolean
  created_at: string
}

/** Profil public embarqué dans les réponses (vendeur, hôte de session…). */
export interface PublicUser {
  id: number | null
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

export interface Listing {
  id: number
  user_id: number
  title: string
  description: string | null
  price_cents: number
  category: string
  condition: string
  city: string | null
  photos: string[]
  status: string
  created_at: string
  updated_at: string
  seller: PublicUser
}

export interface Offer {
  id: number
  listing_id: number
  user_id: number
  amount_cents: number
  message: string | null
  status: string
  created_at: string
  buyer?: PublicUser
}

export interface BMXSession {
  id: number
  user_id: number
  title: string
  description: string | null
  city: string | null
  spot_id: number | null
  starts_at: string
  created_at: string
  host: PublicUser
  members: PublicUser[]
  members_count: number
}

export interface Shop {
  id: number
  name: string
  description: string | null
  city: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  url: string | null
  photo_url: string | null
  submitted_by: number | null
  approved: boolean
  created_at: string
  updated_at: string
}

export interface Effects {
  vhs: boolean
  fisheye: number
  grain: number
  slowmo: number
}

export interface Stats {
  parts_count: number
  total_likes: number
  total_views: number
}

export interface AdminStats {
  users: number
  admins: number
  parts: number
  spots: number
  spots_pending: number
  messages: number
  polls: number
  riders: number
  videos: number
}

export interface MediaUpload {
  id: number
  url: string
  kind: string
  content_type: string
  byte_size: number
}

/** Erreur API portant le code HTTP et le message renvoyé par le backend. */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// ---------------------------------------------------------------- Token

const TOKEN_KEY = 'bmx.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* stockage indisponible (mode privé) — on ignore */
  }
}

// ---------------------------------------------------------------- Fetch

async function request<T>(
  method: string,
  path: string,
  opts: { body?: unknown; auth?: boolean; raw?: BodyInit; headers?: Record<string, string> } = {},
): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) }
  if (opts.auth) {
    const t = getToken()
    if (t) headers['Authorization'] = `Bearer ${t}`
  }
  let body: BodyInit | undefined
  if (opts.raw !== undefined) {
    body = opts.raw
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Réessaie plus tard.')
  }

  if (!res.ok) {
    let msg = `Erreur ${res.status}`
    let backendMsg: string | null = null
    try {
      const data = await res.json()
      if (data && typeof data.error === 'string') backendMsg = data.error
    } catch {
      /* corps non-JSON */
    }
    if (backendMsg) msg = backendMsg
    if (res.status === 401) {
      // Sur un appel authentifié, un 401 = token manquant/expiré → on invite à
      // se connecter. Sur un appel public (login), c'est un mauvais identifiant.
      msg = opts.auth ? 'Connecte-toi pour faire ça.' : 'E-mail ou mot de passe incorrect.'
    }
    if (res.status === 403) msg = 'Réservé aux membres ✦ bmx+.'
    throw new ApiError(res.status, msg)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ---------------------------------------------------------------- Endpoints

export const api = {
  // Auth
  register: (b: { email: string; username: string; display_name: string; password: string }) =>
    request<TokenResponse>('POST', '/register', { body: b }),
  login: (b: { email: string; password: string }) =>
    request<TokenResponse>('POST', '/login', { body: b }),
  me: () => request<User>('GET', '/me', { auth: true }),
  myStats: () => request<Stats>('GET', '/me/stats', { auth: true }),
  updateMe: (patch: {
    display_name?: string
    bio?: string
    avatar_url?: string
    stance?: string
    instagram?: string
    city?: string
  }) => request<User>('POST', '/me', { body: patch, auth: true }),
  profile: (id: number) =>
    request<{ user: User; parts_count: number; total_likes: number; total_views: number }>(
      'GET',
      `/users/${id}`,
    ),

  // Abonnement premium (Stripe)
  checkout: () => request<{ url: string }>('POST', '/billing/checkout', { auth: true }),
  portal: () => request<{ url: string }>('POST', '/billing/portal', { auth: true }),

  // Parts
  parts: (sort: 'recent' | 'popular' = 'recent') =>
    request<Part[]>('GET', `/parts?sort=${sort}&per_page=30`),
  likePart: (id: number) => request<Part>('POST', `/parts/${id}/like`, { auth: true }),
  createPart: (b: {
    title: string
    video_media_id?: number
    video_url?: string
    thumbnail_media_id?: number
    duration_secs: number
    effects?: Effects
  }) => request<Part>('POST', '/parts', { body: b, auth: true }),

  // Spots
  spots: () => request<Spot[]>('GET', '/spots'),
  createSpot: (b: {
    name: string
    description?: string
    latitude: number
    longitude: number
    city?: string
    spot_type?: string
    photo_url?: string
    photos?: string[]
  }) => request<Spot>('POST', '/spots', { body: b, auth: true }),

  // Marketplace (annonces + offres / négociation)
  listings: (f: { category?: string; city?: string } = {}) => {
    const p = new URLSearchParams()
    if (f.category) p.set('category', f.category)
    if (f.city) p.set('city', f.city)
    const qs = p.toString()
    return request<Listing[]>('GET', `/listings${qs ? `?${qs}` : ''}`)
  },
  createListing: (b: {
    title: string
    description?: string
    price_cents: number
    category: string
    condition: string
    city?: string
    photos?: string[]
  }) => request<Listing>('POST', '/listings', { body: b, auth: true }),
  markListingSold: (id: number) =>
    request<Listing>('POST', `/listings/${id}/sold`, { auth: true }),
  removeListing: (id: number) =>
    request<Listing>('POST', `/listings/${id}/remove`, { auth: true }),
  listingOffers: (id: number) => request<Offer[]>('GET', `/listings/${id}/offers`, { auth: true }),
  makeOffer: (id: number, b: { amount_cents: number; message?: string }) =>
    request<Offer>('POST', `/listings/${id}/offers`, { body: b, auth: true }),
  acceptOffer: (id: number) => request<Offer>('POST', `/offers/${id}/accept`, { auth: true }),
  declineOffer: (id: number) => request<Offer>('POST', `/offers/${id}/decline`, { auth: true }),

  // Sessions de bmx (rendez-vous entre membres)
  sessions: () => request<BMXSession[]>('GET', '/sessions'),
  createSession: (b: {
    title: string
    description?: string
    city?: string
    spot_id?: number
    starts_at: string
  }) => request<BMXSession>('POST', '/sessions', { body: b, auth: true }),
  joinSession: (id: number) =>
    request<BMXSession>('POST', `/sessions/${id}/join`, { auth: true }),
  leaveSession: (id: number) =>
    request<BMXSession>('POST', `/sessions/${id}/leave`, { auth: true }),

  // Annuaire des BMX shops
  shops: () => request<Shop[]>('GET', '/shops'),
  createShop: (b: {
    name: string
    description?: string
    city?: string
    address?: string
    latitude?: number
    longitude?: number
    url?: string
    photo_url?: string
  }) => request<Shop>('POST', '/shops', { body: b, auth: true }),

  // Sondages
  polls: () => request<PollWithOptions[]>('GET', '/polls'),
  votePoll: (id: number, option_id: number) =>
    request<PollWithOptions>('POST', `/polls/${id}/vote`, { body: { option_id }, auth: true }),

  // Riders (classement + vote)
  riders: () => request<Rider[]>('GET', '/riders'),
  rateRider: (id: number, score: number) =>
    request<Rider>('POST', `/riders/${id}/rate`, { body: { score }, auth: true }),

  // Vidéos (flux Thrasher)
  videos: () => request<Video[]>('GET', '/videos'),

  // Messagerie
  conversations: () => request<Conversation[]>('GET', '/messages', { auth: true }),
  unreadCount: () => request<{ count: number }>('GET', '/messages/unread/count', { auth: true }),
  thread: (userId: number) => request<Message[]>('GET', `/messages/${userId}`, { auth: true }),
  sendMessage: (recipient_id: number, body: string) =>
    request<Message>('POST', '/messages', { body: { recipient_id, body }, auth: true }),

  // Notifications push (Web Push / VAPID)
  pushVapid: () =>
    request<{ enabled: boolean; public_key: string | null }>('GET', '/push/vapid'),
  pushSubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    request<void>('POST', '/push/subscribe', { body: sub, auth: true }),
  pushUnsubscribe: (endpoint: string) =>
    request<void>('POST', '/push/unsubscribe', { body: { endpoint }, auth: true }),

  // Administration (rôle admin requis)
  adminStats: () => request<AdminStats>('GET', '/admin/stats', { auth: true }),

  // Médias (corps brut)
  uploadMedia: (file: File) =>
    request<MediaUpload>('POST', '/media', {
      raw: file,
      auth: true,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Filename': encodeURIComponent(file.name),
      },
    }),
}
