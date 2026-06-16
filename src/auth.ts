// Authentification — store réactif (module singleton). Token JWT persistant
// + utilisateur courant. Usage : const { user, ready, login, ... } = useAuth().
import { ref, type Ref } from 'vue'
import { api, getToken, setToken, type User } from './api'

const user = ref<User | null>(null)
const ready = ref(false)

/** Au démarrage : si un token existe, on récupère le profil. */
export function initAuth() {
  const t = getToken()
  if (!t) {
    ready.value = true
    return
  }
  api
    .me()
    .then((u) => (user.value = u))
    .catch(() => setToken(null)) // token expiré/invalide
    .finally(() => (ready.value = true))
}

async function login(email: string, password: string) {
  const r = await api.login({ email, password })
  setToken(r.token)
  user.value = r.user
}

async function register(b: {
  email: string
  username: string
  display_name: string
  password: string
}) {
  const r = await api.register(b)
  setToken(r.token)
  user.value = r.user
}

function logout() {
  setToken(null)
  user.value = null
}

async function refresh() {
  if (!getToken()) return
  try {
    user.value = await api.me()
  } catch {
    /* token invalide — on garde l'état courant */
  }
}

interface AuthApi {
  user: Ref<User | null>
  ready: Ref<boolean>
  login: (email: string, password: string) => Promise<void>
  register: (b: { email: string; username: string; display_name: string; password: string }) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

export function useAuth(): AuthApi {
  return { user, ready, login, register, logout, refresh }
}
