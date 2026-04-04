import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Preise | fund24',
  description: 'Transparent und fair: Unsere Preismodelle für Unternehmen, Berater und Creator.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Transparente Preise</h1>
          <p className="text-xl text-gray-600">Wählen Sie das Modell, das zu Ihnen passt</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Unternehmen */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className="bg-blue-600 px-6 py-8 text-white">
              <h2 className="text-2xl font-bold mb-2">Unternehmen</h2>
              <p className="text-blue-100">Kostenlos</p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 mb-6">
                0<span className="text-lg">€</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Fördercheck durchführen</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Förderanträge dokumentieren</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Vollständige Verwaltung</span>
                </li>
              </ul>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Kostenlos starten
              </button>
            </div>
          </div>

          {/* Berater */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow border-2 border-orange-500">
            <div className="bg-orange-600 px-6 py-8 text-white">
              <h2 className="text-2xl font-bold mb-2">Berater</h2>
              <p className="text-orange-100">Provisionsmodell</p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                9,99<span className="text-lg">%</span>
              </div>
              <p className="text-sm text-gray-600 mb-6">Provision der Fördersumme</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Alles wie Unternehmen</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Kundenverwalter Funktion</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Analysetools</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Prioritätssupport</span>
                </li>
              </ul>
              <button className="w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition-colors">
                Als Berater registrieren
              </button>
            </div>
          </div>

          {/* BAFA Creator */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className="bg-purple-600 px-6 py-8 text-white">
              <h2 className="text-2xl font-bold mb-2">BAFA Creator</h2>
              <p className="text-purple-100">Freemium & Pro</p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                0<span className="text-lg">€</span>
              </div>
              <p className="text-sm text-gray-600 mb-6">+ optionales Pro Upgrade</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Kostenlose Basis-Features</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Inhaltserstellung</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Publishing Tools</span>
                </li>
              </ul>
              <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                Creator werden
              </button>
            </div>
          </div>
        </div>

        {/* Example Calculation */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Berechnungsbeispiel</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-gray-600 mb-4">Angenommene Fördersumme:</p>
              <p className="text-4xl font-bold text-blue-600 mb-8">50.000€</p>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-700 font-semibold">Unternehmen Gebühr:</p>
                  <p className="text-2xl text-blue-600">0€</p>
                </div>
                <div>
                  <p className="text-gray-700 font-semibold">Berater Provision (9,99%):</p>
                  <p className="text-2xl text-orange-600">4.995€</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-4">Wie wird die Berater-Provision berechnet?</p>
              <p className="text-gray-700 mb-4">
                Die Provision entspricht 9,99% der bewilligten Fördersumme. Bei unserem Beispiel von 50.000€:
              </p>
              <p className="font-mono bg-white p-3 rounded text-sm mb-4">
                50.000€ × 9,99% = 4.995€
              </p>
              <p className="text-xs text-gray-600">
                Die Provision wird nur nach Bewilligung des Förderantrags fällig.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-12">
          <div className="flex">
            <svg className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-lg font-semibold text-yellow-800 mb-2">Wichtiger Hinweis</h4>
              <p className="text-yellow-700">
                <strong>Die Provision wird erst nach schriftlicher Vereinbarung und dem erhaltenen Bewilligungsbescheid fällig.</strong>
                Wir berechnen keine Gebühren für Ablehnungen oder Anträge ohne positiven Bescheid.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Häufig gestellte Fragen</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Gibt es versteckte Gebühren?</h4>
              <p className="text-gray-700">Nein. Für Unternehmen ist fund24 kostenlos. Berater zahlen eine transparente Provision von 9,99% auf die bewilligte Fördersumme - nicht mehr, nicht weniger.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Kann ich später upgraden oder downgraden?</h4>
              <p className="text-gray-700">Ja, Sie können Ihr Modell jederzeit ändern. Für Berater aktualisiert sich die Provisionsberechnung entsprechend.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Sind die Preise in der Grafik inkl. MwSt?</h4>
              <p className="text-gray-700">Die prozentuale Provision wird auf die Brutto-Fördersumme berechnet. Die genaue Rechnungsstellung erfolgt nach individueller Vereinbarung.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
