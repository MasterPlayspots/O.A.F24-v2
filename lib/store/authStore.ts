'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Nutzer } from '../types'

interface AuthState {
  nutzer: Nutzer | null
  token: string | null
  login: (token: string, nutzer: Nutzer) => void
  logout: () => void
  istEingeloggt: () => boolean
  istUnternehmen: () => boolean
  istBerater: () => boolean
  istAdmin: () => boolean
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      nutzer: null,
      token: null,

      login: (token, nutzer) => {
        set({ token, nutzer })
        // Signal-Cookie für Next.js Middleware (kein sensitiver Inhalt):
        if (typeof document !== 'undefined') {
          document.cookie = 'fund24-auth=1; path=/; max-age=86400; SameSite=Lax'
        }
      },

      logout: () => {
        set({ token: null, nutzer: null })
        // Signal-Cookie löschen:
        if (typeof document !== 'undefined') {
          document.cookie = 'fund24-auth=; path=/; max-age=0; SameSite=Lax'
        }
      },

      istEingeloggt: () => get().nutzer !== null,
      istUnternehmen: () => get().nutzer?.role === 'unternehmen',
      istBerater: () => get().nutzer?.role === 'berater',
      istAdmin: () => get().nutzer?.role === 'admin',
    }),
    {
      name: 'fund24-auth',
      partialize: (state) => ({ nutzer: state.nutzer, token: state.token }),
    }
  )
)
