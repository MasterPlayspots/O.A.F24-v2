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
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Plattform</h3>
            <ul className="space-y-2">
              {LINKS.plattform.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Beratung</h3>
            <ul className="space-y-2">
              {LINKS.beratung.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Support</h3>
            <ul className="space-y-2">
              {LINKS.support.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Legal</h3>
            <ul className="space-y-2">
              {LINKS.legal.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; 2026 Fröba Sales Solutions UG (haftungsbeschränkt) &middot; Alle Rechte vorbehalten
        </div>
      </div>
    </footer>
  )
}
