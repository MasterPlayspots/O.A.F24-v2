'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as Sentry from '@sentry/nextjs'
import type { Nutzer } from '../types'

interface AuthState {
  nutzer: Nutzer | null
  /**
   * Bearer-Token für die Cloudflare Worker. Wird im Memory gehalten,
   * NICHT mehr im persistenten Storage (XSS-Schutz). Das echte
   * Session-Cookie ist HttpOnly via /api/session.
   */
  token: string | null
  login: (token: string, nutzer: Nutzer) => Promise<void>
  logout: () => Promise<void>
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

      login: async (token, nutzer) => {
        set({ token, nutzer })
        // Token an Server-Route geben → setzt HttpOnly-Cookie fund24-token,
        // das die Middleware verifiziert.
        try {
          await fetch('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          })
        } catch (err) {
          Sentry.captureException(err, { tags: { area: 'auth', op: 'session-post' } })
        }
      },

      logout: async () => {
        // Erst Server informieren, dann lokalen State leeren — falls
        // der Request fehlschlägt, bleibt der User eingeloggt und
        // kann es erneut versuchen.
        try {
          await fetch('/api/session', { method: 'DELETE' })
        } catch (err) {
          Sentry.captureException(err, { tags: { area: 'auth', op: 'session-delete' } })
        }
        set({ token: null, nutzer: null })
      },

      istEingeloggt: () => get().nutzer !== null,
      istUnternehmen: () => get().nutzer?.role === 'unternehmen',
      istBerater: () => get().nutzer?.role === 'berater',
      istAdmin: () => get().nutzer?.role === 'admin',
    }),
    {
      name: 'fund24-auth',
      // Nur den Nutzer im localStorage halten, NICHT das Token mehr.
      // Das Token wird bei Reload aus dem HttpOnly-Cookie nicht
      // direkt lesbar sein — API-Calls müssen über den Server-Proxy
      // laufen ODER das Token wird beim ersten Request neu geholt.
      partialize: (state) => ({ nutzer: state.nutzer }),
    }
  )
)
