import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-architect-surface font-body text-white flex flex-col items-center justify-center px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-5">fund24</p>
      <h1 className="font-display font-bold text-[8rem] leading-none tracking-[-0.04em] text-white/90">
        404
      </h1>
      <p className="mt-6 max-w-md text-center text-white/70">
        Diese Seite existiert nicht (mehr). Prüfe die URL oder geh zurück zur Startseite.
      </p>
      <div className="mt-10 flex flex-wrap gap-3 justify-center">
        <Link
          href="/"
          className="px-6 py-3 rounded-md font-display font-semibold text-sm text-white tracking-wide
                     bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110
                     shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition"
        >
          Zur Startseite
        </Link>
        <Link
          href="/programme"
          className="px-6 py-3 rounded-md font-display font-semibold text-sm text-white/80 tracking-wide
                     bg-architect-surface-low/40 hover:bg-architect-surface-low/60 transition"
        >
          Förderprogramme ansehen
        </Link>
      </div>
    </div>
  )
}
