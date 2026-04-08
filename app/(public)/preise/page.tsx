import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Preise | fund24',
  description: 'Transparent und fair: Unsere Preismodelle für Unternehmen, Berater und Creator.',
}

export default function PricingPage() {
  const tiers = [
    {
      name: 'Unternehmen',
      tag: 'Kostenlos',
      price: '0',
      unit: '€',
      features: ['Fördercheck durchführen', 'Förderanträge dokumentieren', 'Vollständige Verwaltung'],
      cta: 'Kostenlos starten',
    },
    {
      name: 'Berater',
      tag: 'Provisionsmodell',
      price: '9,99',
      unit: '%',
      sub: 'Provision der Fördersumme',
      features: ['Alles wie Unternehmen', 'Kundenverwalter Funktion', 'Analysetools', 'Prioritätssupport'],
      cta: 'Als Berater registrieren',
      featured: true,
    },
    {
      name: 'BAFA Creator',
      tag: 'Freemium & Pro',
      price: '0',
      unit: '€',
      sub: '+ optionales Pro Upgrade',
      features: ['Kostenlose Basis-Features', 'Inhaltserstellung', 'Publishing Tools'],
      cta: 'Creator werden',
    },
  ]

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold text-white mb-4">Transparente Preise</h1>
          <p className="text-xl text-white/70">Wählen Sie das Modell, das zu Ihnen passt</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`bg-architect-surface/60 rounded-lg overflow-hidden transition-shadow ${
                t.featured ? 'ring-2 ring-architect-primary-light' : ''
              }`}
            >
              <div className="bg-architect-primary px-6 py-8 text-white">
                <h2 className="font-display text-2xl font-bold mb-2">{t.name}</h2>
                <p className="text-architect-primary-light">{t.tag}</p>
              </div>
              <div className="p-6">
                <div className="font-display text-4xl font-bold text-white mb-2">
                  {t.price}
                  <span className="text-lg">{t.unit}</span>
                </div>
                {t.sub && <p className="text-sm text-white/60 mb-6">{t.sub}</p>}
                <ul className="space-y-4 mb-8 mt-6">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start">
                      <svg className="h-5 w-5 text-architect-tertiary-light mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-white/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <button className="w-full bg-architect-primary hover:bg-architect-primary-container text-white py-2 rounded-lg font-semibold transition-colors">
                  {t.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-architect-surface/60 rounded-lg p-8 mb-12">
          <h3 className="font-display text-2xl font-bold text-white mb-6">Berechnungsbeispiel</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-white/60 mb-4">Angenommene Fördersumme:</p>
              <p className="font-display text-4xl font-bold text-architect-primary-light mb-8">50.000€</p>

              <div className="space-y-4">
                <div>
                  <p className="text-white/80 font-semibold">Unternehmen Gebühr:</p>
                  <p className="text-2xl text-architect-primary-light">0€</p>
                </div>
                <div>
                  <p className="text-white/80 font-semibold">Berater Provision (9,99%):</p>
                  <p className="text-2xl text-architect-tertiary-light">4.995€</p>
                </div>
              </div>
            </div>
            <div className="bg-architect-surface-low/40 rounded-lg p-6">
              <p className="text-sm text-white/60 mb-4">Wie wird die Berater-Provision berechnet?</p>
              <p className="text-white/80 mb-4">
                Die Provision entspricht 9,99% der bewilligten Fördersumme. Bei unserem Beispiel von 50.000€:
              </p>
              <p className="font-mono bg-architect-surface/60 p-3 rounded text-sm mb-4 text-white">
                50.000€ × 9,99% = 4.995€
              </p>
              <p className="text-xs text-white/60">
                Die Provision wird nur nach Bewilligung des Förderantrags fällig.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-architect-primary/20 rounded-lg p-6 mb-12">
          <div className="flex">
            <svg className="h-5 w-5 text-architect-primary-light mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-display text-lg font-semibold text-architect-primary-light mb-2">Wichtiger Hinweis</h4>
              <p className="text-white/80">
                <strong>Die Provision wird erst nach schriftlicher Vereinbarung und dem erhaltenen Bewilligungsbescheid fällig.</strong>
                {' '}Wir berechnen keine Gebühren für Ablehnungen oder Anträge ohne positiven Bescheid.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-architect-surface/60 rounded-lg p-8">
          <h3 className="font-display text-2xl font-bold text-white mb-6">Häufig gestellte Fragen</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-display font-semibold text-white mb-2">Gibt es versteckte Gebühren?</h4>
              <p className="text-white/80">Nein. Für Unternehmen ist fund24 kostenlos. Berater zahlen eine transparente Provision von 9,99% auf die bewilligte Fördersumme - nicht mehr, nicht weniger.</p>
            </div>
            <div>
              <h4 className="font-display font-semibold text-white mb-2">Kann ich später upgraden oder downgraden?</h4>
              <p className="text-white/80">Ja, Sie können Ihr Modell jederzeit ändern. Für Berater aktualisiert sich die Provisionsberechnung entsprechend.</p>
            </div>
            <div>
              <h4 className="font-display font-semibold text-white mb-2">Sind die Preise in der Grafik inkl. MwSt?</h4>
              <p className="text-white/80">Die prozentuale Provision wird auf die Brutto-Fördersumme berechnet. Die genaue Rechnungsstellung erfolgt nach individueller Vereinbarung.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
