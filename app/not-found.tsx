import Link from 'next/link'

/*
 * 404 — institutional restraint.
 * Big serif numeral, thin brass rule, one navy CTA, one secondary link.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-brass mb-2">
        fund24
      </p>
      <div className="w-10 h-px bg-brass mb-8" aria-hidden />

      <h1 className="font-display font-normal text-[9rem] leading-none tracking-[-0.04em] text-foreground">
        404
      </h1>

      <p className="font-sans mt-8 max-w-md text-center text-muted-foreground">
        Diese Seite existiert nicht (mehr). Prüfen Sie die URL oder kehren Sie zur
        Startseite zurück.
      </p>

      <div className="mt-10 flex flex-wrap gap-3 justify-center">
        <Link
          href="/"
          className="px-6 py-3 rounded-sm font-sans font-medium text-sm tracking-wide
                     bg-primary text-primary-foreground hover:bg-primary/90
                     transition-colors inline-flex items-center gap-2"
        >
          Zur Startseite
          <span className="text-brass">→</span>
        </Link>
        <Link
          href="/programme"
          className="px-6 py-3 rounded-sm font-sans font-medium text-sm tracking-wide
                     border border-border text-foreground hover:bg-accent
                     transition-colors"
        >
          Förderprogramme ansehen
        </Link>
      </div>
    </div>
  )
}
