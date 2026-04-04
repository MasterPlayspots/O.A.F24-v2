import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support | fund24',
  description: 'Kontaktieren Sie uns für Fragen zur Abwicklung, technischen Support oder telefonische Beratung.',
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Support</h1>
          <p className="text-xl text-gray-600">Wir sind für Sie da – bei Fragen und Problemen</p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Abwicklung */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Abwicklung & Prozesse</h3>
            <p className="text-gray-600 mb-4">
              Fragen zu Antragsverfahren, Dokumentation und Förderrichtlinien
            </p>
            <a href="mailto:abwicklung@fund24.de" className="text-blue-600 hover:text-blue-700 font-semibold">
              abwicklung@fund24.de
            </a>
            <p className="text-sm text-gray-500 mt-3">Durchschnittliche Antwortzeit: 4 Stunden</p>
          </div>

          {/* Technisch */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Technischer Support</h3>
            <p className="text-gray-600 mb-4">
              Probleme mit der Plattform, Bugs und technische Fragen
            </p>
            <a href="mailto:support@fund24.de" className="text-blue-600 hover:text-blue-700 font-semibold">
              support@fund24.de
            </a>
            <p className="text-sm text-gray-500 mt-3">Durchschnittliche Antwortzeit: 2 Stunden</p>
          </div>

          {/* Telefon */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mb-4">
              <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Telefonischer Support</h3>
            <p className="text-gray-600 mb-4">
              Direkter Kontakt für dringende Anliegen
            </p>
            <a href="tel:+49301234567" className="text-blue-600 hover:text-blue-700 font-semibold">
              +49 (0) 30 1234567
            </a>
            <p className="text-sm text-gray-500 mt-3">Mo-Fr 9:00-17:00 Uhr</p>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Öffnungszeiten</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Allgemeine Servicezeiten</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex justify-between">
                  <span>Montag - Freitag:</span>
                  <span className="font-semibold">09:00 - 17:00 Uhr</span>
                </li>
                <li className="flex justify-between">
                  <span>Samstag:</span>
                  <span className="font-semibold">Geschlossen</span>
                </li>
                <li className="flex justify-between">
                  <span>Sonntag:</span>
                  <span className="font-semibold">Geschlossen</span>
                </li>
              </ul>
            </div>
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Notfall-Support</h3>
              <p className="text-gray-700 text-sm mb-3">
                Für kritische Systemausfälle außerhalb unserer Servicezeiten:
              </p>
              <a href="mailto:notfall@fund24.de" className="text-blue-600 hover:text-blue-700 font-semibold">
                notfall@fund24.de
              </a>
              <p className="text-xs text-gray-600 mt-2">
                Bitte nutzen Sie diesen Kanal nur für kritische Störungen.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8" id="faq">Häufig gestellte Fragen</h2>

          <div className="space-y-6">
            {/* FAQ 1 */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                1. Wie lange dauert es, bis mein Support-Anliegen bearbeitet wird?
              </h3>
              <p className="text-gray-700">
                Unser Support-Team bearbeitet Anfragen in der Regel innerhalb von 2-4 Stunden während der Geschäftszeiten. Dringende technische Probleme erhalten höchste Priorität. Für nicht-technische Fragen zu Abwicklung und Prozessen kalkulieren wir bis zu 4 Stunden ein.
              </p>
            </div>

            {/* FAQ 2 */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                2. Kann ich fund24 auch per Telefon erreichen?
              </h3>
              <p className="text-gray-700">
                Ja, wir bieten Telefon-Support unter +49 (0) 30 1234567 montags bis freitags von 09:00 bis 17:00 Uhr an. Für eine schnellere Bearbeitung komplexer Anliegen empfehlen wir, eine E-Mail zu schreiben und die gewünschte Rückrufzeit anzugeben.
              </p>
            </div>

            {/* FAQ 3 */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                3. Meine Website oder App funktioniert nicht. Wer ist der richtige Kontakt?
              </h3>
              <p className="text-gray-700">
                Für alle technischen Probleme wenden Sie sich bitte an unser Technical Support Team unter support@fund24.de. Bitte beschreiben Sie das Problem so detailliert wie möglich und geben Sie Screenshots oder Fehlermeldungen an, damit wir schneller helfen können.
              </p>
            </div>

            {/* FAQ 4 */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                4. Was ist der Unterschied zwischen abwicklung@fund24.de und support@fund24.de?
              </h3>
              <p className="text-gray-700">
                <strong>abwicklung@fund24.de</strong> ist zuständig für Fragen zu Förderantrag-Verfahren, Dokumentation und Richtlinien. <strong>support@fund24.de</strong> ist unser Technical Support für Plattform-Probleme, Bugs und technische Fragen.
              </p>
            </div>

            {/* FAQ 5 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                5. Gibt es einen Ticketing-System für meine Support-Anfragen?
              </h3>
              <p className="text-gray-700">
                Ja! Bei jeder E-Mail-Anfrage erhalten Sie automatisch eine Ticket-Nummer. Mit dieser Nummer können Sie die Bearbeitung jederzeit nachverfolgbar halten und beschleunigen. Bitte geben Sie die Ticket-Nummer in jeder Nachricht an.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-blue-600 rounded-lg shadow-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Sie konnten Ihre Antwort nicht finden?</h2>
          <p className="text-blue-100 mb-6">
            Kontaktieren Sie uns direkt – unser Team freut sich auf Ihre Nachricht!
          </p>
          <a href="mailto:support@fund24.de" className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
            E-Mail schreiben
          </a>
        </div>
      </div>
    </div>
  )
}
