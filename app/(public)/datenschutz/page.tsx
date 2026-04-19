import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutz | fund24',
  description: 'Datenschutzerklärung und Informationen zur Datenverarbeitung bei fund24.',
}

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-architect-surface font-body text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-architect-surface/60 rounded-lg p-8 md:p-12">
        <h1 className="font-display text-4xl font-bold text-white mb-2">Datenschutzerklärung</h1>
        <p className="text-white/60 mb-8">DSGVO-konforme Datenschutzerklärung für fund24</p>

        {/* Verantwortlicher */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">1. Verantwortlicher für die Datenverarbeitung</h2>
          <div className="bg-architect-surface-low/40 rounded-lg p-6 text-white/80 space-y-2">
            <p>
              <strong>Fröba Sales Solutions UG (haftungsbeschränkt)</strong>
            </p>
            <p>
              Johann-Nikolaus-Zitter Str. 31<br />
              96317 Kronach<br />
              Deutschland
            </p>
            <p>
              <strong>E-Mail:</strong> support@fund24.io<br />
              <strong>Telefon:</strong> +49 151 29617192
            </p>
          </div>
        </section>

        {/* Datenverarbeitung */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">2. Datenverarbeitung und Ihre Rechte</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Art der verarbeiteten Daten</h3>
              <ul className="list-disc list-inside text-white/80 space-y-2">
                <li>Kontaktinformationen (Name, E-Mail, Telefon, Adresse)</li>
                <li>Registrierungs- und Nutzerdaten</li>
                <li>Unternehmensinformationen (für Fördercheck)</li>
                <li>Dokumente und Dateien (Upload durch Nutzer)</li>
                <li>Cookies und Tracking-Daten</li>
                <li>Technische Daten (IP-Adresse, Browser, Geräte-Info)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Rechtsgrundlagen</h3>
              <p className="text-white/80 mb-2">
                Die Verarbeitung Ihrer Daten erfolgt auf Grundlage von:
              </p>
              <ul className="list-disc list-inside text-white/80 space-y-2">
                <li>Ihrer Zustimmung gemäß Art. 6 Abs. 1 lit. a DSGVO</li>
                <li>Erfüllung eines Vertrags gemäß Art. 6 Abs. 1 lit. b DSGVO</li>
                <li>Erfüllung einer rechtlichen Verpflichtung gemäß Art. 6 Abs. 1 lit. c DSGVO</li>
                <li>Unseren berechtigten Interessen gemäß Art. 6 Abs. 1 lit. f DSGVO</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Cookies */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">3. Cookies und Tracking</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Authentifizierungs-Cookie</h3>
              <div className="bg-architect-primary/20 rounded-lg p-4 text-white/80">
                <p className="mb-2">
                  <strong>Cookie-Name:</strong> fund24-auth
                </p>
                <p className="mb-2">
                  <strong>Zweck:</strong> Session-Authentifizierung und Sicherheit
                </p>
                <p>
                  <strong>Gültigkeitsdauer:</strong> Sessionsabhängig (wird bei Browser-Schluss gelöscht)
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Signal-Cookie</h3>
              <div className="bg-architect-primary/20 rounded-lg p-4 text-white/80">
                <p className="mb-2">
                  <strong>Cookie-Name:</strong> fund24-signal
                </p>
                <p className="mb-2">
                  <strong>Zweck:</strong> Verbesserung der Benutzerfreundlichkeit und Analytics
                </p>
                <p>
                  <strong>Gültigkeitsdauer:</strong> 1 Jahr
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Weitere Tracking-Tools</h3>
              <p className="text-white/80">
                Wir setzen Analytics-Tools ein, um die Nutzung unserer Website zu analysieren. Diese erfolgen auf Grundlage Ihrer Zustimmung. Sie können diese jederzeit in den Cookie-Einstellungen widerrufen.
              </p>
            </div>
          </div>
        </section>

        {/* Nutzerkonto */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">4. Nutzerkonto und Registrierung</h2>
          <div className="text-white/80 space-y-3">
            <p>
              Bei der Registrierung eines Nutzerkontos werden folgende Daten erfasst:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>E-Mail-Adresse</li>
              <li>Passwort (verschlüsselt)</li>
              <li>Name und Kontaktdaten</li>
              <li>Unternehmens- oder Privatinformationen</li>
              <li>Zahlungsdaten (falls zutreffend)</li>
            </ul>
            <p className="mt-4">
              Diese Daten werden für die Bereitstellung des Services verarbeitet und nicht an Dritte weitergegeben, sofern nicht gesetzlich verpflichtet.
            </p>
          </div>
        </section>

        {/* Dokument-Upload */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">5. Dokument-Upload und Speicherung</h2>
          <div className="space-y-4 text-white/80">
            <p>
              Bei der Nutzung unseres Fördercheck-Services können Sie Dokumente hochladen. Diese werden:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Verschlüsselt übertragen (TLS 1.2+)</li>
              <li>Auf sicheren, in der EU gehosteten Servern gespeichert</li>
              <li>Nur mit Ihrem Zugriff verfügbar gemacht</li>
              <li>Nach Ablauf Ihres Kontos oder auf Anfrage gelöscht</li>
            </ul>
            <p className="mt-4 bg-primary/10 border border-primary/20 rounded-lg p-4">
              <strong>Hinweis:</strong> Wir sind nicht für den Inhalt verantwortlich, den Sie hochladen. Stellen Sie sicher, dass Sie keine sensiblen Informationen ohne Verschlüsselung teilen.
            </p>
          </div>
        </section>

        {/* Betroffenenrechte */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">6. Ihre Rechte gemäß DSGVO</h2>
          <div className="space-y-4 text-white/80">
            <p>Sie haben das Recht auf:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Auskunft (Art. 15 DSGVO):</strong> Sie können jederzeit eine Auskunft über Ihre bei uns gespeicherten Daten anfordern.</li>
              <li><strong>Berichtigung (Art. 16 DSGVO):</strong> Sie können unrichtige Daten berichtigen lassen.</li>
              <li><strong>Löschung (Art. 17 DSGVO):</strong> Sie können die Löschung Ihrer Daten anfordern (Recht auf Vergessenwerden).</li>
              <li><strong>Einschränkung (Art. 18 DSGVO):</strong> Sie können die Verarbeitung Ihrer Daten beschränken lassen.</li>
              <li><strong>Datenportabilität (Art. 20 DSGVO):</strong> Sie erhalten Ihre Daten in strukturierter, gängiger Form.</li>
              <li><strong>Widerspruch (Art. 21 DSGVO):</strong> Sie können der Verarbeitung widersprechen.</li>
            </ul>
            <p className="mt-4">
              Um Ihre Rechte wahrzunehmen, kontaktieren Sie bitte: <strong>support@fund24.io</strong>
            </p>
          </div>
        </section>

        {/* Beschwerde */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">7. Recht auf Beschwerde</h2>
          <div className="bg-architect-surface-low/40 rounded-lg p-6 text-white/80">
            <p className="mb-4">
              Sie haben das Recht, sich bei einer Datenschutzbehörde zu beschweren, wenn Sie der Ansicht sind, dass Ihre Rechte verletzt wurden.
            </p>
            <p>
              <strong>Zuständige Behörde (Bayern):</strong><br />
              Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)<br />
              Promenade 18<br />
              91522 Ansbach<br />
              Tel.: +49 (0) 981 180093-0<br />
              E-Mail: poststelle@lda.bayern.de
            </p>
          </div>
        </section>

        {/* Hosting */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">8. Hosting und externe Dienstleister</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Vercel (Frontend-Hosting)</h3>
              <div className="bg-architect-primary/20 rounded-lg p-4 text-white/80">
                <p className="mb-2">
                  <strong>Anbieter:</strong> Vercel Inc.<br />
                  <strong>Datenschutzerklärung:</strong> <a href="https://vercel.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-architect-primary-light hover:text-white underline">vercel.com/legal/privacy</a>
                </p>
                <p>
                  <strong>Standort:</strong> EU-Daten werden in der EU verarbeitet
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Cloudflare Workers (Serverless-Funktionen)</h3>
              <div className="bg-architect-primary/20 rounded-lg p-4 text-white/80">
                <p className="mb-2">
                  <strong>Anbieter:</strong> Cloudflare Inc.<br />
                  <strong>Datenschutzerklärung:</strong> <a href="https://www.cloudflare.com/de-de/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-architect-primary-light hover:text-white underline">cloudflare.com/de-de/privacypolicy</a>
                </p>
                <p>
                  <strong>Standort:</strong> Globales Edge-Network mit lokaler Datenverarbeitung
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Datenschutzabkommen</h3>
              <p className="text-white/80">
                Alle externe Dienstleister wurden ausgewählt, um DSGVO-Konformität sicherzustellen. Wir haben mit diesen Dienstleistern Auftragsverarbeitungsverträge (AV-Verträge) geschlossen.
              </p>
            </div>
          </div>
        </section>

        {/* Speicherdauer */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">9. Speicherdauer</h2>
          <div className="space-y-4 text-white/80">
            <p>
              Ihre Daten werden nur so lange gespeichert, wie notwendig:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Vertragsdaten: Während der Vertragslaufzeit + 7 Jahre (Buchhaltung)</li>
              <li>Registrierungsdaten: Solange Sie das Konto aktiv nutzen</li>
              <li>Support-Tickets: 2 Jahre nach Abschluss</li>
              <li>Cookies: Je nach Typ (Session bis 1 Jahr)</li>
            </ul>
            <p className="mt-4">
              Sie können jederzeit die Löschung Ihrer Daten anfordern (außer wo gesetzlich verpflichtet).
            </p>
          </div>
        </section>

        {/* Weitergabe an Dritte */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">10. Weitergabe von Daten an Dritte</h2>
          <div className="text-white/80">
            <p className="mb-4">
              Wir geben Ihre Daten nicht an Dritte weiter, außer:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Auftragsverarbeiter (unter Auftragsverarbeitungsvertrag)</li>
              <li>Gesetzliche Anforderungen (z.B. Behörden, Gerichte)</li>
              <li>Mit Ihrer ausdrücklichen Zustimmung</li>
              <li>Zur Erfüllung von Verträgen mit Ihnen</li>
            </ul>
            <p className="mt-4 bg-primary/10 border border-primary/20 rounded-lg p-4">
              <strong>Hinweis:</strong> Für Berater mit Kundenverwalter-Funktion können Ihre Unternehmensdaten sichtbar für den verwaltenden Berater sein. Sie können dies in den Kontoverwaltungseinstellungen kontrollieren.
            </p>
          </div>
        </section>

        {/* Kontakt */}
        <section className="mb-8">
          <h2 className="font-display text-2xl font-bold text-white mb-4">11. Fragen zum Datenschutz?</h2>
          <div className="bg-architect-primary/20 rounded-lg p-6 text-white/80">
            <p>
              <strong>Datenschutzbeauftragter:</strong><br />
              E-Mail: support@fund24.io<br />
              Telefon: +49 151 29617192
            </p>
            <p className="mt-4">
              Wir beantworten Datenschutzfragen innerhalb von 30 Tagen.
            </p>
          </div>
        </section>

        {/* Letzte Aktualisierung */}
        <div className="pt-8 text-sm text-white/60">
          <p>
            <strong>Letzte Aktualisierung:</strong> 16. April 2026
          </p>
        </div>
      </div>
    </div>
  )
}
