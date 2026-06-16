// Contexte d'authentification — token JWT persistant + utilisateur courant.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken, type User } from './api'

interface AuthState {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (b: {
    email: string
    username: string
    display_name: string
    password: string
  }) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  // Au démarrage : si un token existe, on récupère le profil.
  useEffect(() => {
    const t = getToken()
    if (!t) {
      setReady(true)
      return
    }
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null)) // token expiré/invalide
      .finally(() => setReady(true))
  }, [])

  async function login(email: string, password: string) {
    const r = await api.login({ email, password })
    setToken(r.token)
    setUser(r.user)
  }

  async function register(b: {
    email: string
    username: string
    display_name: string
    password: string
  }) {
    const r = await api.register(b)
    setToken(r.token)
    setUser(r.user)
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  async function refresh() {
    if (!getToken()) return
    try {
      setUser(await api.me())
    } catch {
      /* token invalide — on garde l'état courant */
    }
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
