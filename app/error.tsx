'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[fund24] unhandled error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white flex flex-col items-center justify-center px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-5">fund24</p>
      <h1 className="font-display font-bold text-6xl tracking-[-0.02em] text-white/90">
        Etwas ist schiefgelaufen
      </h1>
      <p className="mt-5 max-w-md text-center text-white/70">
        Wir konnten diese Seite gerade nicht laden. Versuch es in einem Moment noch einmal —
        oder melde dich beim Support, falls der Fehler bleibt.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs text-white/40 font-mono">Fehler-ID: {error.digest}</p>
      )}
      <div className="mt-10 flex flex-wrap gap-3 justify-center">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-md font-display font-semibold text-sm text-white tracking-wide
                     bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110
                     shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition"
        >
          Erneut versuchen
        </button>
        <Link
          href="/"
          className="px-6 py-3 rounded-md font-display font-semibold text-sm text-white/80 tracking-wide
                     bg-architect-surface-low/40 hover:bg-architect-surface-low/60 transition"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  )
}
