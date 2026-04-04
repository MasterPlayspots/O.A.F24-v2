import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum | fund24',
  description: 'Impressum und rechtliche Informationen von fund24.',
}

export default function ImpressumPage() {
  // TODO: Alle Platzhalter vor Go-Live ersetzen

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Impressum</h1>

        {/* Angaben gemäß § 5 DDG */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Angaben gemäß § 5 Telemediengesetz (TMG)</h2>

          <div className="space-y-8">
            {/* Verantwortlicher */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Verantwortlicher im Sinne des TMG und MDStV</h3>
              <div className="bg-gray-50 rounded-lg p-6 space-y-2 text-gray-700">
                <p>
                  <strong>fund24 GmbH</strong>
                </p>
                <p>
                  Musterstraße 123<br />
                  10115 Berlin<br />
                  Deutschland
                </p>
                <p>
                  <strong>Vertreten durch:</strong><br />
                  Max Mustermann (Geschäftsführer)<br />
                  Mustafa Musterfrau (Geschäftsführerin)
                </p>
              </div>
            </div>

            {/* Kontaktdaten */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Kontaktdaten</h3>
              <div className="bg-gray-50 rounded-lg p-6 space-y-2 text-gray-700">
                <p>
                  <strong>Telefon:</strong> +49 (0) 30 1234567
                </p>
                <p>
                  <strong>E-Mail:</strong> info@fund24.de
                </p>
                <p>
                  <strong>Webseite:</strong> www.fund24.de
                </p>
              </div>
            </div>

            {/* Registereintrag */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Registereintrag</h3>
              <div className="bg-gray-50 rounded-lg p-6 space-y-2 text-gray-700">
                <p>
                  <strong>Handelsregister:</strong> Amtsgericht Charlottenburg, Berlin<br />
                  <strong>Registernummer:</strong> HRB 123456 B<br />
                  <strong>USt-ID:</strong> DE123456789
                </p>
              </div>
            </div>

            {/* Umsatzsteuer */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Umsatzsteuer-Identifikationsnummer</h3>
              <div className="bg-gray-50 rounded-lg p-6 space-y-2 text-gray-700">
                <p>
                  <strong>USt-IdNr.:</strong> DE 123 456 789<br />
                  Gemäß § 27a Umsatzsteuergesetz (UStG)
                </p>
              </div>
            </div>

            {/* Berufsbezeichnung */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Berufsbezeichnung und zuständige Berufsaufsichtsbehörde</h3>
              <div className="bg-gray-50 rounded-lg p-6 space-y-2 text-gray-700">
                <p>
                  <strong>Berufsbezeichnung:</strong> Softwareentwicklung und Förderberatung
                </p>
                <p>
                  <strong>Zuständige Behörde:</strong><br />
                  Industrie- und Handelskammer Berlin<br />
                  Kurfürstendamm 33<br />
                  10719 Berlin
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Haftungsausschluss */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Haftungsausschluss</h2>
          <div className="prose prose-neutral max-w-none text-gray-700">
            <h3 className="font-semibold">Haftung für Inhalte</h3>
            <p>
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>

            <h3 className="font-semibold mt-6">Haftung für Links</h3>
            <p>
              Unsere Website enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
            </p>

            <h3 className="font-semibold mt-6">Urheberrecht</h3>
            <p>
              Die auf dieser Website veröffentlichten Inhalte und Werke unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des Autors oder Schöpfers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
            </p>
          </div>
        </section>

        {/* Datenschutz */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Datenschutz</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-gray-700">
            <p className="mb-4">
              Die Nutzung unserer Website ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf unseren Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder E-Mail-Adresse) erhoben werden, erfolgt dies soweit möglich auf freiwilliger Basis.
            </p>
            <p>
              Weitere Informationen zum Datenschutz finden Sie in unserer <a href="/datenschutz" className="text-blue-600 hover:text-blue-700 underline">Datenschutzerklärung</a>.
            </p>
          </div>
        </section>

        {/* Streitbeilegung */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Streitbeilegung</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Alternative Streitbeilegung gemäß Art. 14 Abs. 1 ODR-VO</h3>
              <p className="text-gray-700">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit, die unter folgender Adresse erreichbar ist: https://ec.europa.eu/consumers/odr
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Verbraucherstreitbeilegung / Universalschlichter</h3>
              <p className="text-gray-700">
                Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </div>
          </div>
        </section>

        {/* Haftungsbeschränkung */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Haftungsbeschränkung für Schäden</h2>
          <div className="bg-gray-50 rounded-lg p-6 text-gray-700">
            <p>
              Haftungsansprüche gegen fund24 wegen Schäden materieller oder ideeller Art, welche auf der Nutzung oder Nichtnutzung der dargebotenen Informationen bzw. durch die Nutzung fehlerhafter und unvollständiger Informationen verursacht wurden, sind grundsätzlich ausgeschlossen, sofern ein nachweislich grober Verschulden unsererseits nicht vorliegen. Alle Angebote sind freibleibend und unverbindlich. Wir behalten uns vor, Teile der Seiten oder das gesamte Angebot ohne gesonderte Ankündigung zu verändern, zu ergänzen, zu löschen oder die Veröffentlichung zeitweise oder endgültig einzustellen.
            </p>
          </div>
        </section>

        {/* Letzte Aktualisierung */}
        <div className="border-t border-gray-200 pt-8 text-sm text-gray-600">
          <p>
            <strong>Letzte Aktualisierung:</strong> {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}
