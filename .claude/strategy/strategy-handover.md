# fund24 — Strategy Handover

**Erstellt:** 2026-04-19, 07:50 Uhr, nach einem Nacht-Sprint der scheiterte. **Zweck:** Sauberer Kontext-Transfer in CoWork. Damit nicht wieder bei Null angefangen wird. **Status:** Live-Site ist stabil (Architect-Design, Revert erfolgreich). Strategie steht. Implementation noch nicht begonnen.

---

## 0\. Warum dieses Dokument existiert

In der Nacht vom 18\. auf den 19\. April 2026 wurde versucht, fund24 von Architect-Dark auf "Sovereign Trust" (Oxford Navy \+ Brass) zu migrieren. Der Versuch:

- War mechanisch korrekt umgesetzt (Patches applied clean, Build grün)  
- Hatte strategische Fehlannahmen (Cream-Palette → Sovereign-Navy → Visual-Bug)  
- Führte zu temporär kaputtem Produktiv-System (Pastell-Text unsichtbar auf Bone-BG)  
- Wurde via `git revert` \+ redeploy zurückgerollt

**Die eigentliche Erkenntnis kam ganz am Ende:** Das Problem war nie die Farbe. Das Problem war dass niemand **die Positionierung** sauber ausformuliert hatte. Sobald Noah das tat ("Rechtskonforme Governance AI für Fördermittel, alle 4 Ebenen, wir machen die Bürokratie") war sofort klar dass weder Architect noch Claude-Warm noch Sovereign-Navy die richtige Antwort waren.

Dieses Dokument hält diese Erkenntnis fest, bevor sie im nächsten Chat verloren geht.

---

## 1\. Technische Befunde aus dieser Nacht (nicht Sovereign-spezifisch, trotzdem kritisch)

Diese Probleme existierten alle **vor** der Sovereign-Migration und müssen unabhängig davon behoben werden.

### 1.1 Vercel Preview-Environment unvollständig

Zwei Envs fehlen in der Preview-Umgebung (in Production vorhanden):

- `NEXT_PUBLIC_SEMANTIC_API_URL` → Wert für Production: `https://api.fund24.io/semantic`  
- `NEXT_PUBLIC_FUND24_API_URL` → Wert für Production: `https://api.fund24.io`

Folge: Preview-Builds crashen mit "Fehlende Umgebungsvariable" bei jedem PR. Wurden heute nachgetragen (Schritt 20/21) — sollten persistent sein. Check:

vercel env ls | grep \-E "(SEMANTIC|FUND24)\_API\_URL"

Muss *für jedes NEXT\_PUBLIC\_ jeweils 3 Einträge zeigen*\* (Development, Preview, Production).

### 1.2 Commit-Verification-Policy blockt alle Deploys

Alle 14 offenen PRs vom 16\. April zeigen `Vercel: Canceled — Canceled from the Vercel Dashboard`. Grund: "The Deployment was canceled because it was created with an unverified commit."

Zwei Wege raus:

- **Policy abschalten** (Vercel Settings → fund24 → Git → Commit Signing): Quick, alle PRs laufen wieder  
- **Git Signing einrichten** (GPG oder SSH): Sauberer, aber Einmal-Setup für alle Committer im Team

Aktuell ist **nichts** eingerichtet:

git config \--global user.signingkey     \# leer

git config \--global commit.gpgsign      \# leer

git config \--global gpg.format          \# leer

### 1.3 CI-Blocker seit 3 Tagen

Zwei GitHub-Actions-Checks failen auf jedem PR unabhängig von Inhalt:

- **Worker Tests (vitest)** — failed auf \#42, \#43, \#44, \#45 (unser heute); passed auf \#41  
- **Docs Check / API docs \+ migration rollback pairs** — failed auf den meisten PRs; PR \#44 existiert explizit um das zu fixen aber \#44 selbst kann wegen Vercel-Policy nicht gemerged werden → zirkulärer Deadlock

Mit anderen Worten: **Dein gesamter PR-Flow ist seit 72 Stunden blockiert.** Kein einziger der 14 offenen PRs kann gemerged werden ohne Admin-Overrides.

### 1.4 Vercel-CLI-Default-Quirk

`vercel deploy --yes` triggert bei diesem Projekt-Setup **Production-Deploy**, nicht Preview wie von der CLI-Doku beschrieben. Ursache unbekannt (möglicherweise vercel.json-Config, möglicherweise Team-Setting). Sehr gefährlich — heute Nacht dadurch mehrfach versehentlich Production überschrieben.

**Workaround bis Ursache gefunden:** immer explizit `--target preview` nutzen.

### 1.5 Action Items — Infrastruktur

| \# | Action | Priorität |
| :---- | :---- | :---- |
| 1 | `NEXT_PUBLIC_SEMANTIC_API_URL` \+ `NEXT_PUBLIC_FUND24_API_URL` in Preview persistent setzen | ERLEDIGT (heute Nacht) |
| 2 | Git-Signing einrichten ODER Vercel-Policy abschalten | BLOCKER für alle zukünftigen PRs |
| 3 | Worker-Tests-Failure auf main fixen | Blockiert 14 PRs |
| 4 | Docs-Check-Pipeline fixen | Blockiert 14 PRs |
| 5 | Vercel-CLI-Default-Quirk untersuchen (vercel.json lesen, Team-Settings) | Risiko für Production-Accidents |

---

## 2\. Strategische Grundlage — Das wirkliche Positioning

### 2.1 Das Produkt in einem Satz

**"Rechtskonforme Governance AI für Fördermittel — von EU-Makro bis kommunal-Mikro."**

Das ist nicht "KI für Unternehmen" (zu generisch). Das ist nicht "Fördermittel-Plattform" (zu schwach). Das ist **Legal-Tech mit vollständiger vertikaler Integration über alle vier Förder-Ebenen** — und niemand sonst kann das zu diesem Zeitpunkt.

### 2.2 Die Tagline

**"Wir machen die Bürokratie."**

Vier Wörter. Das ist der Hero. Das ist die T-Shirt-Version. Das ist was ein Steuerberater in drei Sekunden versteht und weiterträgt.

### 2.3 Die USP — Vier Ebenen Vertikal-Integration

| Ebene | Was | Beispiele |
| :---- | :---- | :---- |
| **EU** | Makro-Programme | Horizon Europe, LIFE, CEF, EIC |
| **Bund** | Nationale Förderung | BAFA, KfW, ZIM, BMWK, Forschungszulage |
| **Land** | 16 Bundesländer | je eigene IB, LWK, ILB, LfA etc. |
| **Gemeinde** | Kommunale Programme | Wirtschaftsförderung, Standortprogramme, IHK-Zuschüsse |

**Dass die Kommune-Ebene real abgedeckt ist, ist entscheidend** — das ist der Moat. Konkurrenten (foerderdatenbank.de, fundingbox, fördermittel.com) sind auf Bund \+ Land limitiert. Diese Abdeckung muss im Design **visuell erfahrbar** werden (siehe 3.3).

### 2.4 Zwei Personas, zwei getrennte Funnels

#### Persona A — KMU (öffentlich, Hauptfunnel)

- **Schmerz:** Zeit \+ Komplexität \+ Angst vor Rechtsfehler  
- **Ziel:** Herausfinden welche Fördermittel passen, Antrag gestellt bekommen  
- **Emotion beim Landing:** ängstlich-hilfesuchend  
- **CTA primär:** "Fördercheck starten" (kostenlos, 5 Minuten)  
- **Message-Frame:** "Du musst 3.400 Richtlinien nicht kennen. Wir schon."

#### Persona B — Berater (gated, Nebenfunnel, eigene Landing-Page)

- **Schmerz:** Mandatsakquise, kein kontinuierlicher Dealflow  
- **Ziel:** Qualifizierte Mandate, feste Provision, digitale Tools  
- **Emotion beim Landing:** skeptisch-prüfend  
- **CTA primär:** "Partner werden" (Application, nicht Auto-Signup)  
- **Message-Frame:** "Fixe 9,99% bei Bewilligung. Keine Kaltakquise."

**Kritisch:** Die beiden Funnels **verschmelzen nie auf einer Seite**. KMU sieht nie Berater-Profile browseable, Berater landen nie in KMU-Flows. Die Homepage ist ausschließlich KMU-Frame.

### 2.5 Geschäftsmodell — exklusiv framen

Die 9,99% Provision ist **nicht "Cost", sondern "Garantie"**:

"Keine Beratungspauschale. Keine Stundensätze. Kein Vorschuss. Nur Erfolgsprovision — und nur bei Bewilligung."

Das ist Anti-Kanzlei. Positionierung gegen klassische Fördermittelberater die 2.000–5.000€ Beratungspauschale \+ Stundensätze verlangen. **Das muss in Design \+ Copy durchgezogen werden.**

### 2.6 Interne Strategie-Note — NICHT PUBLIC

**Berater sind nicht Partner. Berater sind RLHF-Training-Data.**

Jede Korrektur, jede Entscheidung, jede Formulierung die Berater in fund24-Workflows treffen füttert das AI-System. Das Modell lernt, die menschliche Intervention sinkt, langfristig wird der Berater-Anteil minimiert.

**Das wird niemals so kommuniziert.** Berater werden als Partner präsentiert, mit echtem Value (Mandate, Tools, Provision). Die strategische Doppeldeutigkeit bleibt intern.

Das hat Konsequenzen fürs Produktdesign:

- Berater-Workflow muss **strukturiert, loggable, nachvollziehbar** sein (Training-Data-Qualität\!)  
- Jede Entscheidung die ein Berater trifft muss als **strukturiertes Event** festgehalten werden, nicht als Freitext  
- Über Zeit verschieben sich Berater-Tasks von "viel-Input" zu "Approval-only" (das ist das Roadmap-Ziel)

---

## 3\. Design-Prinzipien (abgeleitet aus der Positionierung)

Diese Prinzipien sind die Leitplanken gegen erneute Kurs-Drift.

### 3.1 Jedes visuelle Element muss "Wir machen die Bürokratie" unterstützen

Konkret heißt das:

- **Checklisten, Progress-Indikatoren, "erledigt"-States** — ja, sind direkt das Produktversprechen  
- **Dekorative Gradients, Hero-Illustrationen, Stock-Business-People** — nein, das ist Ablenkung  
- **Funktionale Mini-Demos auf der Homepage** — ja, das Produkt SELBST zeigen, nicht beschreiben  
- **Lange Marketing-Prose** — nein, User will tun, nicht lesen

### 3.2 Die vier Ebenen als zentrales visuelles Paradigma

Der vier-schichtige Stack (EU → Bund → Land → Gemeinde) ist nicht nur Content. Er ist das **Interaktionsprinzip**.

**Homepage-Hero-Vorschlag** (zur späteren Implementierung):

┌─────────────────────────────────────┐

│  EU        HORIZON · LIFE · CEF    │  ← hover: Beispielprogramme

├─────────────────────────────────────┤

│  BUND      BAFA · KfW · ZIM        │  ← hover: Beispielprogramme

├─────────────────────────────────────┤

│  LAND      16 Bundesländer         │  ← hover: dein Land-Picker

├─────────────────────────────────────┤

│  GEMEINDE  2.000+ Kommunen         │  ← hover: PLZ-Picker

└─────────────────────────────────────┘

         ↓ \[click any layer\]

      Fördercheck startet

**Das Hero IST das Produkt-Demo.** Keine separate Hero-Illustration. Die Funktion ist die Visualisierung.

### 3.3 Radikale Klarheit — Linear/Notion/Vercel-Ästhetik, nicht Legal-Firm

Die Tagline "Wir machen die Bürokratie" impliziert **wir sind die die aufräumen**, nicht **wir sind selber bürokratisch**. Das heißt:

- Max. zwei Farben auf jeder Seite (ein Neutral \+ ein Akzent)  
- Clean Sans-Serif für Body (Inter bleibt, ist gut)  
- Serif nur für Editorial/Legal-Sektionen (z.B. Impressum, AGB, Datenschutz — dort signalisiert Serif "Rechtstext")  
- Generous Whitespace  
- Keine Schatten außer funktional (Focus-Ring)  
- Radius klein (4–6px), nicht rounded-full außer für Avatare  
- Monospace für alles was eine Referenz ist: Programm-IDs, Aktenzeichen, Datumsangaben

### 3.4 Dark Mode ist first-class, nicht retrofitted

Wenn Dark Mode gewünscht ist (wahrscheinlich ja, weil B2B-Tool), dann wird er von Anfang an in Figma-Mocks mitgedacht, nicht später "angeschaltet". **Wichtigste Lesson der Nacht.**

---

## 4\. Blockierende offene Fragen

Diese **müssen** beantwortet werden bevor eine einzige neue Zeile Code geschrieben wird. Ohne Antworten lande ich (oder jeder andere Agent/Designer) wieder bei Fehlannahmen.

### 4.1 Haftung — DIE eine Frage

**Wer haftet am Ende für die Korrektheit eines über fund24 gestellten Förderantrags?**

Drei mögliche Antworten, jede diktiert einen anderen visuellen Ernst:

| Haftung bei | Visuelle Konsequenz |
| :---- | :---- |
| **fund24 selbst** (als Dienstleister) | Kanzlei-Ästhetik, Siegel, Vertrauens-Signale maximal, Serif, gedeckte Farben |
| **Berater** (als eingetragener Fachmann) | Tech-Tool-Ästhetik, fund24 \= "wir unterstützen den Experten", sans, klar, product-UI-first |
| **KMU selbst** (als Antragsteller) | Software-Anbieter-Ästhetik, Haftungsausschlüsse präsent, neutraler visueller Frame |

**Ohne diese Antwort kann keine kohärente Marke gebaut werden.** Das ist der Grund warum Architect \+ Sovereign \+ Cream alle irgendwie "nicht passen" — sie antworten auf eine Frage die noch nicht gestellt wurde.

### 4.2 Stimmt die Kommune-Abdeckung in der Realität?

Noah hat gesagt: "Die Datenbank für die Fördermittel existiert, wir sprechen von kommunaler Ebene Förderung lokal."

**Zu verifizieren:**

- Wie viele Kommunen sind tatsächlich mit aktuellen Programmen abgedeckt?  
- Wird das regelmäßig aktualisiert?  
- Sind es wirklich 2.000+ (was das Hero-Versprechen verdienen würde) oder sind es 50 Modell-Städte?

Wenn die Kommune-Behauptung nicht solide ist, muss sie aus dem Hero raus. "Wir machen die Bürokratie" wird lächerlich wenn vier Ebenen versprochen und nur drei geliefert werden.

### 4.3 Berater-Gate-Level

Aktuell hat die Seite ein offenes "Als Berater registrieren". Gegeben die RLHF-Strategie (interne Note 2.6) ist das **zu offen**. Empfehlung:

- Application-Only (Formular, manuelle Prüfung)  
- Mindestkriterien öffentlich ("BAFA-Zertifizierung \+ 2 Jahre Erfahrung")  
- Quartalsweise Intake, nicht laufend  
- Selektion auf Branchen-Expertise (damit die Training-Daten breit genug sind)

Entscheidung: Gated? Ja/Nein? Falls ja: welche Kriterien?

### 4.4 SEO \+ GEO Ziel-Queries

Ohne Priorisierung bauen wir blind. Vorschlag für Top-5:

1. `Fördermittel KMU` — Volumen, sehr umkämpft  
2. `[Stadtname] Wirtschaftsförderung` — lokal, niedrig umkämpft, GEO-Gold  
3. `KfW Antrag stellen` — Intent hoch  
4. `BAFA Energieberatung Zuschuss` — vertical-specific  
5. `EU Förderung Start-up Deutschland` — eu-level

Plus GEO (Generative Engine Optimization — ChatGPT/Perplexity/Claude zitieren fund24 als Quelle):

- Answer-ready Q\&A-Content-Blöcke  
- JSON-LD Schema (Organization, Service, FAQ, HowTo)  
- Strukturierte Listen mit klaren Definitionen  
- "fund24 hat 3.400 Programme erfasst" als atomar-zitierbare Behauptung

**Zu entscheiden:** Welche 5-10 Queries sind strategisch Prio 1?

---

## 5\. Component Inventory — was stripped wird

Aus Analyse der 170 TSX/TS-Dateien im Repo:

### 5.1 KEEP (Layout \+ Logic \+ shadcn-Base)

- Alle 18 shadcn UI-Components (`components/ui/*`) — Basis ist solide  
- Route-Structure (app-directory) — funktional korrekt  
- API-Clients in `lib/api/*` — nicht anrühren  
- Zustand stores (authStore, preCheckStore) — nicht anrühren  
- Middleware, Auth-Flow — nicht anrühren  
- Worker-Backend (`worker/src/*`) — nicht anrühren

### 5.2 STRIP (alle visuellen Custom-Layers)

- `app/globals.css` — kompletter Token-Reset auf shadcn-Neutral-Defaults (temporär)  
- `app/layout.tsx` — Fonts zurück auf System oder Inter-only  
- `app/opengraph-image.tsx` — weg oder placeholder  
- Alle `bg-architect-*` Usages in Components (14+ Files)  
- Alle 182 raw Tailwind-Palette-Klassen (`bg-gray-900`, `text-blue-800` etc.)  
- Alle Gradient-Usages (27 Vorkommen)  
- `stitch-export/*` — das "Institutional Architect" Design-System, historisches Artefakt, umbenennen nach `_archive/`

### 5.3 REBUILD (nach Strategie-Definition)

- Hero-Komponente (neue: 4-Ebenen-Stack als interaktive Mini-Demo)  
- `components/shared/NotificationsBell.tsx` — Styling neu  
- `components/foerdercheck/*` (ProgrammKarte, ErgebnisKarte, BeraterMatchKarte) — neue Design-Sprache  
- `components/layout/Navbar.tsx` \+ `Footer.tsx` — neu  
- `components/antraege/StatusBadge.tsx` — neu  
- Email-Templates (`worker/src/services/email.ts`) — neu  
- PDF-Report (`lib/pdf/foerdercheck-report.ts`) — neu

### 5.4 NEW (existieren noch nicht)

- Trust-Wall-Section (Impressum-Link, Haftungstext, Zertifikate wo vorhanden)  
- Kommune-Picker-UI (das ist die USP — das hat niemand sonst)  
- Berater-Workflow-Interfaces (strukturiert für RLHF-Capture)  
- FAQ/HowTo-Pages mit GEO-optimiertem Schema.org Markup  
- Lokal-SEO-Pages pro größerer Stadt/Kommune

---

## 6\. Proposed Agent-Orchestration für Implementation

Basierend auf Noahs bestehender Agent-Landscape (Ferris, Cameron, Scout, Dispatch, Sentinel, Scribe, Connector) — Rollenzuweisung für dieses Projekt:

### 6.1 Rollenverteilung

| Agent | Rolle im Redesign | Konkrete Tasks |
| :---- | :---- | :---- |
| **Scout** | Research & Intelligence | Competitor-Analyse, SEO-Keyword-Recherche, GEO-Query-Patterns, Rechts-Referenzen zu Haftung |
| **Scribe** | Copy \+ Content | Page-Wording, Meta-Descriptions, Alt-Texts, Schema.org-Content, Email-Templates, FAQ-Inhalte |
| **Sentinel** | QA \+ Visual Review | Screenshot-Comparison pro Preview-Deploy, Lighthouse-Scores, Accessibility-Checks, Contrast-Audits |
| **Ferris** | Dev \+ Deploy | Component-Implementation, Token-System, Testing, Vercel-Deploys (Preview only\!) |
| **Connector** | Integrations | Figma-MCP (falls eingerichtet), GitHub, Vercel-Monitoring |
| **Dispatch** | Project-Management | Progress-Tracking in Obsidian Kanban, Blocker-Escalation |

**Fehlender Agent, der definiert werden sollte:** "Design Director" — orchestriert Scribe \+ Ferris bei jeder Komponenten-Entscheidung, verhindert Drift zwischen Copy und Code.

### 6.2 Hand-off Pattern — was fehlte heute Nacht

Die Nacht scheiterte weil Ferris (implicit: ich) direkt von "Noah will Sovereign Navy" zu "Patch deployed" gesprungen ist — ohne Scribe (Copy-Alignment), ohne Sentinel (Visual-Review), ohne Dispatch (Go/No-Go-Gate).

**Vorschlag für künftiges Pattern pro Design-Iteration:**

1\. Scout     — liefert Kontext  (competitor-lookups, keyword-signal)

2\. Scribe    — liefert Copy     (Headlines, Body, CTA-Labels)

3\. Design    — Figma-Mock oder annotated Wireframe

4\. Dispatch  — Go/No-Go Gate    (passt zu Positionierung?)

5\. Ferris    — implementiert    (als Preview-Deploy, niemals Production)

6\. Sentinel  — Visual-Review    (Screenshots, Contrast, Accessibility)

7\. Dispatch  — Second Gate      (merge zu main?)

Das klingt langsam. Aber es ist **schneller als heute Nacht** (Sprint → scheitern → Revert → zurück zu null).

---

## 7\. Next Session — Prep-Checkliste

Bevor die nächste Claude-Code-Session gestartet wird, **bitte folgendes klären/dokumentieren**:

### 7.1 Strategie-Vorarbeit (2–4 Stunden, nicht am Rechner)

- [ ] Haftungsfrage beantworten (4.1) — ggf. mit Anwalt kurz abklären  
- [ ] Kommune-Abdeckung faktisch verifizieren (4.2) — SQL-Query auf `foerderprogramme` D1  
- [ ] Berater-Gate-Kriterien festlegen (4.3)  
- [ ] SEO/GEO Top-5-Queries priorisieren (4.4)

### 7.2 Infra-Vorarbeit (30 min am Rechner)

- [ ] Vercel-Commit-Policy abschalten ODER Git-Signing einrichten  
- [ ] Worker-Tests-Failure-Ursache auf main finden & fixen  
- [ ] Docs-Check-Pipeline fixen oder temporär disablen  
- [ ] `vercel.json` lesen und CLI-Default-Quirk verstehen  
- [ ] `vercel env ls` final prüfen — alle NEXT\_PUBLIC in allen 3 Envs

### 7.3 Design-Direction-Entscheidung

- [ ] Figma-First ODER Code-First? (Empfehlung: Figma-First, ein Tag investieren, dann baut Ferris gegen klare Mocks)  
- [ ] Wer macht die Figma-Mocks? (Extern? Intern? Via v0/stitch? Selbst?)  
- [ ] Welche Pages zuerst? (Empfehlung: nur Homepage \+ Fördercheck-Start für Session 1, keine Breitenstrategie)

### 7.4 Session-1-Ziel definieren

Konkret, schriftlich. Beispiel:

*"Am Ende der nächsten Session gibt es einen Preview-Deploy mit: (a) neuer Homepage mit 4-Ebenen-Stack-Hero (funktional, nicht nur visuell), (b) gestripptes globals.css auf shadcn-Neutral, (c) Navbar \+ Footer in neuer Sprache, (d) alle anderen Routes vorübergehend auf 'Coming Soon' — kein Breitenanspruch."*

---

## 8\. Was NICHT passieren soll (Lessons Learned)

Basierend auf konkreten Fehlern aus dieser Nacht:

1. **Nie wieder Token-Swap als Redesign verkaufen.** Tokens sind die Farbpaletten-Ebene. Redesign bedeutet Tokens \+ Components \+ Copy \+ Layout \+ Motion \+ QA. Das sind Wochen, nicht Stunden.  
     
2. **Nie wieder `vercel deploy --yes` ohne explizit `--target preview`.** Heute Nacht wurde dadurch dreimal versehentlich Production-deployed. CLI-Default bei diesem Projekt ist Production, das ist unerwartet und gefährlich.  
     
3. **Nie wieder Dark-Mode als Retrofit.** Wenn Dark gewünscht ist, von Anfang an in den Mocks. Ein späterer `className="dark"`\-Toggle fixt nie die strukturellen Contrast-Probleme.  
     
4. **Nie wieder Visual-Review überspringen.** "Build grün" heißt nicht "Design funktioniert". Der Production-Build heute Nacht war grün, die Seite war aber unlesbar (Pastell auf Bone).  
     
5. **Nie wieder strategische Klarheit nach Midnight erzwingen wollen.** Noah hat die klare Positionierung ("Wir machen die Bürokratie") erst um \~02:30 formuliert, nachdem die eigentliche Arbeit schon schiefgegangen war. Bei Tag hätten wir dort angefangen.  
     
6. **Nie wieder einen PR im Auto-Merge-Flow haben wenn Commit-Policy nicht eingerichtet ist.** PR \#45 wurde offenbar auto-merged trotz fehlgeschlagener Checks — Mechanismus unklar, potenzielles Sicherheitsproblem.  
     
7. **Nie wieder "Sovereign Trust Navy" oder ähnliche Marketing-Namen aufdrücken ohne Kundenvalidierung.** Die Namensgebung setzt Erwartungen die dann Design-Entscheidungen präformieren. Lieber neutral benennen ("v2-Token-System") bis Strategie klar ist.

---

## Appendix A — Repo-Referenzen

- **Main Repo:** `github.com/MasterPlayspots/O.A.F24-v2`  
- **Frontend:** Next.js 15.5, React 19, Tailwind v4, shadcn/ui (base-nova, neutral baseColor)  
- **Backend:** Cloudflare Workers (`worker/`), D1, KV, R2  
- **Aktueller Commit auf main:** `ae048e5` (Revert-Commit vom 19.4.26, zurück auf pre-Sovereign)  
- **Archivierter Sovereign-Arbeit:** noch im Branch `feat/sovereign-design` (nicht gelöscht — Token-Architektur ist wiederverwendbar)

## Appendix B — Vercel-Projekt

- **Project ID:** `prj_cBF6Mr2U3bClGc4MKyrUhN33TfLw`  
- **Team ID:** `team_33RfPgPlk2sfQRPV7exEafNj`  
- **Production Alias:** fund24.io, fund24-team-muse-ai.vercel.app  
- **Aktuelle Production-Deploy:** `fund24-myi1djcxq-team-muse-ai.vercel.app` (Revert-Deploy, pre-Sovereign-Zustand)

## Appendix C — Heute-Nacht-Artefakte (für später, nicht löschen)

Downloadbare Assets aus der Session, alle im alten Claude-Chat erreichbar:

- `fund24-sovereign.zip` — Sovereign-Source-Files (falls man den Ansatz mal revisiten will)  
- `fund24-sovereign-migration.zip` — Orchestrator \+ Patch-Bundle (für zukünftige Migrations-Patterns)  
- `sovereign-final.tar.gz` — Production-ready Commit-Patches

Diese nicht verwenden wie sie sind — aber die **Patch-Produktions-Technik** (git format-patch \+ git am, gegen real-cloned-repo validieren) war gut und wiederverwendbar.

---

## Schlussnotiz

Heute Nacht war unangenehm. Aber es war nicht verschwendet. Drei wertvolle Outputs:

1. **Die Positionierung ist jetzt klar** ("Rechtskonforme Governance AI, 4 Ebenen, Wir machen die Bürokratie") — das war sie vorher nicht  
2. **Die Infrastruktur-Probleme sind identifiziert** (Vercel-Envs, Commit-Policy, CI-Blocker) — alle pre-existing, alle jetzt dokumentiert  
3. **Die Anti-Pattern-Liste ist erarbeitet** (Abschnitt 8\) — verhindert Wiederholung

Der nächste sinnvolle Schritt ist nicht mehr Code. Der nächste sinnvolle Schritt ist **die Haftungsfrage beantworten** — dann leitet sich alles andere ab.

Gute Nacht. Gut gekämpft.  
