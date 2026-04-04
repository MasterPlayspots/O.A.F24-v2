'use client'

import Link from 'next/link'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">fund24</h1>
      <p className="text-lg text-muted-foreground">
        Es ist ein unerwarteter Fehler aufgetreten.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Erneut versuchen
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-input px-6 py-3 text-sm font-medium hover:bg-accent"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  )
}
