import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Kontaktieren Sie uns für Fragen zur Abwicklung, technischen Support oder telefonische Beratung.',
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-architect-surface font-body text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold text-white mb-4">Support</h1>
          <p className="text-xl text-white/70">Wir sind für Sie da – bei Fragen und Problemen</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {[
            { title: 'Abwicklung & Prozesse', desc: 'Fragen zu Antragsverfahren, Dokumentation und Förderrichtlinien', email: 'support@fund24.io', time: 'Durchschnittliche Antwortzeit: 4 Stunden' },
            { title: 'Technischer Support', desc: 'Probleme mit der Plattform, Bugs und technische Fragen', email: 'support@fund24.io', time: 'Durchschnittliche Antwortzeit: 2 Stunden' },
            { title: 'Telefonischer Support', desc: 'Direkter Kontakt für dringende Anliegen', email: '+49 151 29617192', isPhone: true, time: 'Mo-Fr 9:00-17:00 Uhr' },
          ].map((c) => (
            <div key={c.title} className="bg-architect-surface/60 rounded-lg p-6 hover:bg-architect-surface/40 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 bg-architect-primary/20 rounded-lg mb-4">
                <svg className="h-6 w-6 text-architect-primary-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold text-white mb-2">{c.title}</h3>
              <p className="text-white/70 mb-4">{c.desc}</p>
              <a href={c.isPhone ? `tel:${c.email.replace(/\s/g, '')}` : `mailto:${c.email}`} className="text-architect-primary-light hover:text-white font-semibold">
                {c.email}
              </a>
              <p className="text-sm text-white/50 mt-3">{c.time}</p>
            </div>
          ))}
        </div>

        <div className="bg-architect-surface/60 rounded-lg p-8 mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-6">Öffnungszeiten</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-display font-semibold text-white mb-4">Allgemeine Servicezeiten</h3>
              <ul className="space-y-2 text-white/80">
                <li className="flex justify-between"><span>Montag - Freitag:</span><span className="font-semibold">09:00 - 17:00 Uhr</span></li>
                <li className="flex justify-between"><span>Samstag:</span><span className="font-semibold">Geschlossen</span></li>
                <li className="flex justify-between"><span>Sonntag:</span><span className="font-semibold">Geschlossen</span></li>
              </ul>
            </div>
            <div className="bg-architect-primary/20 rounded-lg p-6">
              <h3 className="font-display font-semibold text-white mb-3">Notfall-Support</h3>
              <p className="text-white/80 text-sm mb-3">
                Für kritische Systemausfälle außerhalb unserer Servicezeiten:
              </p>
              <a href="mailto:support@fund24.io" className="text-architect-primary-light hover:text-white font-semibold">
                support@fund24.io
              </a>
              <p className="text-xs text-white/60 mt-2">
                Bitte nutzen Sie diesen Kanal nur für kritische Störungen.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-architect-surface/60 rounded-lg p-8">
          <h2 className="font-display text-2xl font-bold text-white mb-8" id="faq">Häufig gestellte Fragen</h2>

          <div className="space-y-6">
            {[
              { q: '1. Wie lange dauert es, bis mein Support-Anliegen bearbeitet wird?', a: 'Unser Support-Team bearbeitet Anfragen in der Regel innerhalb von 2-4 Stunden während der Geschäftszeiten. Dringende technische Probleme erhalten höchste Priorität. Für nicht-technische Fragen zu Abwicklung und Prozessen kalkulieren wir bis zu 4 Stunden ein.' },
              { q: '2. Kann ich fund24 auch per Telefon erreichen?', a: 'Ja, wir bieten Telefon-Support unter +49 151 29617192 montags bis freitags von 09:00 bis 17:00 Uhr an. Für eine schnellere Bearbeitung komplexer Anliegen empfehlen wir, eine E-Mail zu schreiben und die gewünschte Rückrufzeit anzugeben.' },
              { q: '3. Meine Website oder App funktioniert nicht. Wer ist der richtige Kontakt?', a: 'Für alle technischen Probleme wenden Sie sich bitte an unser Technical Support Team unter support@fund24.io. Bitte beschreiben Sie das Problem so detailliert wie möglich und geben Sie Screenshots oder Fehlermeldungen an, damit wir schneller helfen können.' },
              { q: '4. Was ist der Unterschied zwischen den Support-Adressen?', a: 'Beide Adressen werden vom selben Team betreut. Bitte kontaktieren Sie uns einfach unter support@fund24.io.' },
              { q: '5. Gibt es einen Ticketing-System für meine Support-Anfragen?', a: 'Ja! Bei jeder E-Mail-Anfrage erhalten Sie automatisch eine Ticket-Nummer. Mit dieser Nummer können Sie die Bearbeitung jederzeit nachverfolgbar halten und beschleunigen. Bitte geben Sie die Ticket-Nummer in jeder Nachricht an.' },
            ].map((f) => (
              <div key={f.q} className="pb-6">
                <h3 className="font-display text-lg font-semibold text-white mb-3">{f.q}</h3>
                <p className="text-white/80">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 bg-architect-primary rounded-lg p-8 text-center text-white">
          <h2 className="font-display text-2xl font-bold mb-4">Sie konnten Ihre Antwort nicht finden?</h2>
          <p className="text-architect-primary-light mb-6">
            Kontaktieren Sie uns direkt – unser Team freut sich auf Ihre Nachricht!
          </p>
          <a href="mailto:support@fund24.io" className="inline-block bg-white text-architect-primary px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors">
            E-Mail schreiben
          </a>
        </div>
      </div>
    </div>
  )
}
