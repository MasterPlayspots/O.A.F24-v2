import { Metadata } from 'next'
import Link from 'next/link'
import { Check, AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Preise',
  description: 'Transparent und fair: fund24 ist kostenlos für Unternehmen. Berater zahlen 9,99 % Provision — nur bei bewilligtem Antrag.',
}

interface Tier {
  name: string
  tag: string
  price: string
  unit: string
  sub?: string
  features: string[]
  cta: { label: string; href: string }
  featured?: boolean
}

export default function PricingPage() {
  const tiers: Tier[] = [
    {
      name: 'Unternehmen',
      tag: 'Komplett kostenlos',
      price: '0',
      unit: '€',
      features: [
        'Kostenloser KI-Fördercheck',
        'Zugang zum Katalog mit 3.400+ Programmen',
        'Antragstellung direkt auf der Plattform',
        'Dokumenten-Upload & Verwaltung',
        'Berater einladen (Antrag-Zugriff)',
        'DSGVO-konforme Datenspeicherung',
      ],
      cta: { label: 'Kostenlos starten', href: '/registrieren?rolle=unternehmen' },
    },
    {
      name: 'Berater',
      tag: 'Provision auf Erfolgsbasis',
      price: '9,99',
      unit: '%',
      sub: 'der bewilligten Fördersumme · nur bei Erfolg',
      features: [
        'Öffentliches Profil im Verzeichnis',
        'Direktanfragen von Unternehmen',
        'Antrag- & Dokumenten-Zugriff per Einladung',
        'Beratungen verwalten (Phasen-Tracking)',
        'Vorlagen-Bibliothek für Berichte',
        'Prioritäts-Support',
      ],
      cta: { label: 'Als Berater registrieren', href: '/registrieren?rolle=berater' },
      featured: true,
    },
  ]

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white py-16 px-6 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">Preise</p>
          <h1 className="font-display text-5xl font-bold text-white tracking-[-0.02em] sm:text-6xl">
            Transparent. Fair. Kostenlos für Unternehmen.
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-2xl mx-auto">
            Kein Abo, kein Lock-in, keine versteckten Gebühren. Du zahlst nur, wenn Förderung wirklich fließt.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-xl bg-architect-surface/60 overflow-hidden ${
                t.featured ? 'ring-2 ring-architect-tertiary-light shadow-[0_20px_60px_rgba(6,158,124,0.15)]' : ''
              }`}
            >
              {t.featured && (
                <div className="absolute top-0 right-0 px-4 py-1.5 text-xs font-display font-semibold uppercase tracking-wide text-architect-tertiary-light bg-architect-tertiary/20 rounded-bl-lg">
                  Empfohlen für Berater
                </div>
              )}
              <div className="px-8 pt-10 pb-6">
                <h2 className="font-display text-2xl font-bold text-white tracking-tight">{t.name}</h2>
                <p className="mt-2 text-sm text-white/60">{t.tag}</p>
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="font-display text-6xl font-bold text-white tracking-[-0.02em]">{t.price}</span>
                  <span className="font-display text-2xl font-semibold text-white/80">{t.unit}</span>
                </div>
                {t.sub && <p className="mt-2 text-sm text-white/60">{t.sub}</p>}
              </div>

              <div className="px-8 pb-8 flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <Check className="h-5 w-5 shrink-0 text-architect-tertiary-light mt-0.5" />
                      <span className="text-sm text-white/80 leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.cta.href}
                  className={`mt-8 inline-flex items-center justify-center rounded-md px-6 py-3 font-display font-semibold text-sm tracking-wide transition ${
                    t.featured
                      ? 'bg-gradient-to-br from-architect-tertiary to-bg-chart-5 hover:brightness-110 text-white shadow-[0_10px_40px_rgba(6,158,124,0.25)]'
                      : 'bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110 text-white shadow-[0_10px_40px_rgba(101,117,173,0.25)]'
                  }`}
                >
                  {t.cta.label}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Provisions-Rechner */}
        <div className="rounded-xl bg-architect-surface-low/50 p-10 mb-10">
          <h2 className="font-display text-2xl font-bold text-white mb-8 tracking-tight">
            Berechnungsbeispiel
          </h2>
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <p className="text-sm text-white/60 mb-3">Angenommene bewilligte Fördersumme</p>
              <p className="font-display text-5xl font-bold text-architect-primary-light tracking-[-0.02em] mb-8">
                50.000 €
              </p>
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-white/60">Gebühr Unternehmen</p>
                  <p className="font-display text-2xl font-bold text-white">0 €</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Provision Berater (9,99 %)</p>
                  <p className="font-display text-2xl font-bold text-architect-tertiary-light">4.995 €</p>
                </div>
              </div>
            </div>
            <div className="bg-architect-surface/60 rounded-lg p-6">
              <p className="text-sm text-white/60 mb-3">So wird gerechnet</p>
              <p className="font-mono text-sm bg-architect-surface-low/50 px-4 py-3 rounded-md text-white mb-4">
                50.000 € × 9,99 % = 4.995 €
              </p>
              <p className="text-xs text-white/60 leading-relaxed">
                Die Provision wird ausschließlich nach Eingang des schriftlichen Bewilligungsbescheids
                fällig. Bei Ablehnung fallen keine Kosten an.
              </p>
            </div>
          </div>
        </div>

        {/* Hinweis */}
        <div className="rounded-lg bg-architect-primary/15 p-6 mb-16 flex items-start gap-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-architect-primary-light mt-0.5" />
          <div>
            <h3 className="font-display font-semibold text-white mb-1">Keine Kosten bei Ablehnung</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              Weder Unternehmen noch Berater zahlen etwas, wenn der Förderantrag abgelehnt wird.
              Die Provision wird erst nach <strong>schriftlicher Vereinbarung</strong> und dem{' '}
              <strong>positiven Bewilligungsbescheid</strong> fällig.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-xl bg-architect-surface/60 p-10">
          <h2 className="font-display text-2xl font-bold text-white mb-8 tracking-tight">
            Häufige Fragen
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="font-display font-semibold text-white mb-2">Gibt es versteckte Kosten?</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Nein. Für Unternehmen ist fund24 komplett kostenlos — inklusive Antragstellung,
                Dokumentenverwaltung und Berater-Einladung. Berater zahlen transparente 9,99 % Provision
                auf die bewilligte Fördersumme.
              </p>
            </div>
            <div>
              <h3 className="font-display font-semibold text-white mb-2">Was passiert bei Antragsablehnung?</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Bei Ablehnung entstehen keine Kosten. Weder Unternehmen noch Berater zahlen eine Gebühr.
                Du kannst jederzeit einen neuen Antrag für andere Programme stellen.
              </p>
            </div>
            <div>
              <h3 className="font-display font-semibold text-white mb-2">Wann wird die Provision fällig?</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Erst nach schriftlicher Vereinbarung zwischen Berater und Unternehmen und nach Eingang
                des positiven Bewilligungsbescheids durch die Fördermittelstelle.
              </p>
            </div>
            <div>
              <h3 className="font-display font-semibold text-white mb-2">Sind die Preise brutto oder netto?</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Die 9,99 % Provision wird auf die Brutto-Fördersumme berechnet. Berater erhalten eine
                individuelle Rechnung nach Vereinbarung.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
