import Link from 'next/link'

const LINKS = {
  plattform: [
    { href: '/', label: 'Startseite' },
    { href: '/programme', label: 'Programme' },
    { href: '/berater', label: 'Berater' },
    { href: '/preise', label: 'Preise' },
  ],
  beratung: [
    { href: '/foerder-schnellcheck', label: 'Fördercheck starten' },
    { href: '/registrieren?rolle=berater', label: 'Berater werden' },
    { href: '/aktuelles', label: 'Aktuelles' },
  ],
  support: [
    { href: '/support', label: 'Kontakt' },
    { href: '/support#faq', label: 'FAQ' },
  ],
  legal: [
    { href: '/datenschutz', label: 'Datenschutz' },
    { href: '/impressum', label: 'Impressum' },
    { href: '/agb', label: 'AGB' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-architect-surface-low/40 font-body text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {([
            ['Plattform', LINKS.plattform],
            ['Beratung', LINKS.beratung],
            ['Support', LINKS.support],
            ['Legal', LINKS.legal],
          ] as const).map(([title, items]) => (
            <div key={title}>
              <h3 className="font-display mb-3 text-sm font-semibold text-white">{title}</h3>
              <ul className="space-y-2">
                {items.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/60 hover:text-architect-primary-light">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 text-center text-xs text-white/50">
          &copy; 2026 Fröba Sales Solutions UG (haftungsbeschränkt) &middot; Alle Rechte vorbehalten
        </div>
      </div>
    </footer>
  )
}
