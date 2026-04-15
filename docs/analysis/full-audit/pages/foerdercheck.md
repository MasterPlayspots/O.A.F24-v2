# Route: /foerdercheck

**Source:** `app/foerdercheck/page.tsx`
**Persona:** protected unternehmen
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Fördercheck Wizard

## H2
—

## H3
—

## Buttons
- Weiter zum Chat → (submit, navigates to /foerdercheck/[id]/chat on success)

## Links
—

## Form Fields
- **Firmenname *** (type=text, placeholder="z.B. TechFlow GmbH") — firmenname
- **Branche *** (type=select) — branche; options: IT/Software, Handwerk, Einzelhandel, Gastronomie/Hotel, Produktion, Logistik, Energie/Umwelt, Beratung, Gesundheit, Bildung, Andere
- **Bundesland *** (type=select) — bundesland; options: all 16 German Länder
- **Vorhaben *** (type=select) — vorhaben; options: Digitalisierung, Energie & Effizienz, Gründung, Innovation & Forschung, Personal, Export, Investition, Beratung einholen
- **Mitarbeiterzahl (optional)** (type=number, placeholder="z.B. 15") — mitarbeiterzahl
- **Jahresumsatz in EUR (optional)** (type=number, placeholder="z.B. 500000") — jahresumsatz
- **Gründungsjahr (optional)** (type=number, placeholder="z.B. 2020") — gruendungsjahr
- **Investitionsvolumen in EUR (optional)** (type=number, placeholder="z.B. 100000") — investitionsvolumen

## Messages / Toasts
- "Finden Sie die passenden Förderprogramme für Ihr Unternehmen" (subtitle)
- "Authentifizierung läuft..." (loader text)
- "Wird gesendet..." (submit pending)
- "Token nicht verfügbar"
- "Ein Fehler ist aufgetreten" (fallback)
- Zod validation: "Firmenname muss mindestens 2 Zeichen lang sein", "Branche ist erforderlich", "Bundesland ist erforderlich", "Vorhaben ist erforderlich"
- SchrittAnzeige steps: Angaben, Chat, Dokumente, Analyse, Ergebnisse

## Notes
- Uses legacy light-theme Card styling (`bg-gradient-to-b from-background to-muted/20`), NOT the dark "Institutional Architect" look used elsewhere → visual inconsistency.
- No explicit rolle guard beyond middleware; a berater could theoretically reach this.
