import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen (AGB)',
  description: 'Allgemeine Geschäftsbedingungen für die Nutzung der fund24 Plattform.',
}

export default function AGBPage() {
  return (
    <div className="min-h-screen bg-architect-surface font-body text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-architect-surface/60 rounded-lg p-8 md:p-12">
        <h1 className="font-display text-4xl font-bold text-white mb-2">Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p className="text-white/60 mb-8">Bedingungen für die Nutzung der fund24 Plattform</p>

        {/* Geltungsbereich */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">1. Geltungsbereich und Vertragsgegenstand</h2>
          <div className="space-y-4 text-white/80">
            <p>
              Diese AGB regeln das Verhältnis zwischen Fröba Sales Solutions UG (haftungsbeschränkt) (nachfolgend &bdquo;Dienstleister&ldquo; genannt) und den Nutzer der fund24-Plattform (nachfolgend &bdquo;Nutzer&ldquo; oder &bdquo;Kunde&ldquo; genannt).
            </p>
            <p>
              Die fund24-Plattform ist ein digitales Werkzeug zur Verwaltung, Dokumentation und Abwicklung von Förderanträgen. Der Dienstleister stellt diese Plattform als Software-as-a-Service (SaaS) bereit.
            </p>
            <p>
              Durch die Registrierung und Nutzung der Plattform akzeptieren Sie diese AGB in ihrer jeweiligen gültigen Fassung.
            </p>
          </div>
        </section>

        {/* Leistungsumfang */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">2. Leistungsumfang</h2>
          <div className="space-y-4 text-white/80">
            <h3 className="font-display font-semibold text-white">2.1 Verfügbare Services</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Fördercheck und -verwaltung</li>
              <li>Dokumentenverwaltung und -speicherung</li>
              <li>Benutzerkonten und Authentifizierung</li>
              <li>Analysetools und Berichte (je nach Modell)</li>
              <li>Technischer Support</li>
            </ul>

            <h3 className="font-display font-semibold text-white mt-4">2.2 Keine Rechtsberatung</h3>
            <p>
              Die fund24-Plattform bietet <strong>keine Rechtsberatung</strong>. Alle Informationen dienen zu Informationszwecken und ersetzen keine professionelle rechtliche oder steuerliche Beratung. Sie sind verantwortlich dafür, einen Rechtsanwalt oder Steuerberater zu konsultieren, falls erforderlich.
            </p>

            <h3 className="font-display font-semibold text-white mt-4">2.3 Verfügbarkeit</h3>
            <p>
              Wir streben eine Verfügbarkeit von 99% an, können aber keine Garantie übernehmen. Wir behalten uns das Recht vor, die Plattform zu Wartungszwecken zu unterbrechen, sofern wir Sie angemessen benachrichtigen.
            </p>
          </div>
        </section>

        {/* Registrierung und Konten */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">3. Registrierung und Kontenverwaltung</h2>
          <div className="space-y-4 text-white/80">
            <p>
              <strong>3.1 Registrierungsvoraussetzungen:</strong> Sie müssen mindestens 18 Jahre alt sein und über die gesetzliche Handlungsfähigkeit verfügen.
            </p>
            <p>
              <strong>3.2 Authentizität der Daten:</strong> Sie garantieren, dass alle Registrierungsdaten wahrheitsgemäß und vollständig sind. Sie sind verantwortlich für die Richtigkeit der Angaben.
            </p>
            <p>
              <strong>3.3 Passwort und Sicherheit:</strong> Sie sind verantwortlich dafür, dass Ihr Passwort vertraulich bleibt. Sie müssen uns umgehend benachrichtigen, wenn Sie vermuten, dass Ihr Konto kompromittiert wurde.
            </p>
            <p>
              <strong>3.4 Kontonutzung:</strong> Sie erklären sich einverstanden, die Plattform nur für zulässige Zwecke zu nutzen und nicht gegen Gesetze zu verstoßen.
            </p>
          </div>
        </section>

        {/* Gebühren und Preise */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">4. Gebühren und Preise</h2>
          <div className="space-y-4 text-white/80">
            <p>
              <strong>4.1 Preismodelle:</strong> Die aktuellen Preise finden Sie auf unserer <a href="/preise" className="text-architect-primary-light hover:text-white underline">Preisseite</a>. Preise und Leistungsumfang können mit angemessener Benachrichtigung geändert werden.
            </p>
            <p>
              <strong>4.2 Berater-Provision:</strong> Die Provision wird nur nach Erhalt eines positiven Bewilligungsbescheids fällig und ist schriftlich zu vereinbaren.
            </p>
            <p>
              <strong>4.3 Zahlung:</strong> Zahlungen erfolgen gemäß Rechnungsstellung. Zahlungsverzug führt zu Strafzinsen in Höhe von 1% pro Monat.
            </p>
            <p>
              <strong>4.4 Keine Rückerstattung von Provisionen:</strong> Gezahlte Provisionen werden nicht erstattet, auch wenn ein Antrag später abgelehnt wird.
            </p>
          </div>
        </section>

        {/* Nutzungsrechte */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">5. Nutzungsrechte und Eigentum</h2>
          <div className="space-y-4 text-white/80">
            <p>
              <strong>5.1 Geistiges Eigentum:</strong> Alle Inhalte, Code und Design der fund24-Plattform sind Eigentum von fund24 und durch Urheberrecht geschützt.
            </p>
            <p>
              <strong>5.2 Ihre Inhalte:</strong> Sie behalten das Eigentum an Dokumenten und Daten, die Sie hochladen. Sie gewähren uns eine Lizenz zur Speicherung und Verarbeitung dieser Inhalte, um die Dienstleistungen zu erbringen.
            </p>
            <p>
              <strong>5.3 Beschränkung der Nutzung:</strong> Sie dürfen die Plattform nicht kopieren, verändern, verbreiten oder für kommerzielle Zwecke nutzen, ohne schriftliche Genehmigung.
            </p>
          </div>
        </section>

        {/* Datenschutz und Sicherheit */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">6. Datenschutz und Datensicherheit</h2>
          <div className="space-y-4 text-white/80">
            <p>
              <strong>6.1 Datenschutzerklärung:</strong> Die Verarbeitung Ihrer Daten erfolgt gemäß unserer <a href="/datenschutz" className="text-architect-primary-light hover:text-white underline">Datenschutzerklärung</a>.
            </p>
            <p>
              <strong>6.2 Sicherheitsmaßnahmen:</strong> Wir implementieren angemessene technische und organisatorische Sicherheitsmaßnahmen (Verschlüsselung, Firewall, etc.). Wir können jedoch keine absolute Sicherheit garantieren.
            </p>
            <p>
              <strong>6.3 Ihre Verantwortung:</strong> Sie sind verantwortlich für sichere Passwörter und die Sicherheit Ihres Geräts und Internet-Verbindung.
            </p>
          </div>
        </section>

        {/* Haftung */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">7. Haftungsbeschränkung</h2>
          <div className="space-y-4 text-white/80">
            <p>
              <strong>7.1 Disclaimer:</strong> Die Plattform wird auf &bdquo;as-is&ldquo; Basis bereitgestellt. Wir geben keine Garantie auf Richtigkeit, Vollständigkeit oder Aktualität der Informationen.
            </p>
            <p>
              <strong>7.2 Haftungsbegrenzung:</strong> Unsere Haftung ist begrenzt auf die im letzten Jahr gezahlten Gebühren (oder 100€, je nachdem, was größer ist).
            </p>
            <p>
              <strong>7.3 Ausgeschlossene Haftung:</strong> Wir haften nicht für indirekte Schäden, Datenverlust, oder Gewinnausfall.
            </p>
            <p>
              <strong>7.4 Keine Garantie für Förderung:</strong> Die Nutzung der Plattform garantiert keine Förderung oder Bewilligung von Anträgen.
            </p>
          </div>
        </section>

        {/* Nutzungsverletzungen */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">8. Verbotene Handlungen</h2>
          <div className="text-white/80">
            <p className="mb-4">Sie dürfen die Plattform nicht nutzen, um:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Illegale oder rechtswidrige Inhalte zu hochladen</li>
              <li>Andere Nutzer zu belästigen oder zu bedrohen</li>
              <li>Sicherheitslücken auszunutzen oder in Systeme einzudringen</li>
              <li>Malware oder schädliche Code einzuschleusen</li>
              <li>Andere Nutzer zu täuschen oder Betrug zu begehen</li>
              <li>Urheberrechte oder andere Schutzrechte zu verletzen</li>
              <li>Plattform-Ressourcen für Spam oder Missbrauch zu nutzen</li>
            </ul>
          </div>
        </section>

        {/* Kündigungsrecht */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">9. Kündigung und Beendigung</h2>
          <div className="space-y-4 text-white/80">
            <p>
              <strong>9.1 Kündigungsfristen:</strong> Beide Parteien können die Vereinbarung mit 30 Tagen Kündigungsfrist zum Ende eines Kalendermonats kündigen.
            </p>
            <p>
              <strong>9.2 Sofortige Kündigung:</strong> fund24 kann die Vereinbarung sofort kündigen, wenn der Nutzer gegen AGB verstößt.
            </p>
            <p>
              <strong>9.3 Datenlöschung:</strong> Nach Kündigung wird ein Backupzeitraum von 30 Tagen gewährt. Danach werden Ihre Daten gelöscht (außer wo gesetzlich vorgeschrieben).
            </p>
          </div>
        </section>

        {/* Änderungen */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">10. Änderungen der AGB</h2>
          <div className="text-white/80">
            <p>
              Wir behalten uns das Recht vor, diese AGB jederzeit mit 30 Tagen Vorlaufzeit zu ändern. Änderungen werden per E-Mail mitgeteilt. Durch Weitergenutzung der Plattform akzeptieren Sie die neuen Bedingungen.
            </p>
          </div>
        </section>

        {/* Salvatorische Klausel */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">11. Salvatorische Klausel</h2>
          <div className="text-white/80">
            <p>
              Falls eine Bestimmung dieser AGB unwirksam ist, bleibt der Rest gültig. Die unwirksame Bestimmung wird durch eine wirksame Bestimmung ersetzt, die dem ursprünglichen Zweck am nächsten kommt.
            </p>
          </div>
        </section>

        {/* Anwendbares Recht */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-white mb-4">12. Anwendbares Recht und Gerichtsstand</h2>
          <div className="text-white/80">
            <p className="mb-4">
              <strong>Anwendbares Recht:</strong> Diese AGB unterliegen deutschem Recht, insbesondere dem BGB.
            </p>
            <p>
              <strong>Gerichtsstand:</strong> Gerichtsstand für alle Rechtsstreitigkeiten ist Berlin, sofern der Nutzer Kaufmann, Handelsgesellschaft oder juristische Person des öffentlichen Rechts ist.
            </p>
          </div>
        </section>

        {/* Kontakt */}
        <section className="mb-8">
          <h2 className="font-display text-2xl font-bold text-white mb-4">13. Kontakt und Fragen</h2>
          <div className="bg-architect-primary/20 rounded-lg p-6 text-white/80">
            <p>
              <strong>Fröba Sales Solutions UG (haftungsbeschränkt)</strong><br />
              Johann-Nikolaus-Zitter Str. 31<br />
              96317 Kronach<br />
              E-Mail: support@fund24.io<br />
              Telefon: +49 151 29617192
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
