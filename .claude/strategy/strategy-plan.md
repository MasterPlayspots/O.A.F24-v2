# fund24 — Strategy Plan

**Erstellt:** 2026-04-19 (rekonstruierte Synthese)
**Quellen:** `strategy-handover.md` (Nacht-Sprint-Post-Mortem, 07:50), `next-session-handover.md` (Post-Revert-Update, später am selben Tag)

> **Rekonstruktions-Disclaimer:** Dieses Dokument synthetisiert die strategischen Entscheidungen und Prinzipien aus den zwei überlebenden Handover-Dokumenten. Das ursprüngliche Planning-Session-Output mit "13 Entscheidungen + 31 Action Items" ist nicht mehr physisch verfügbar — die hier enthaltenen Entscheidungen sind nur die, die in den Handovers explizit referenziert sind. Wenn es detailliertere Planungs-Notizen gab, sind sie verloren.

---

## 1. Positioning — in einem Satz

**"Rechtskonforme Governance AI für Fördermittel — von EU-Makro bis Land-Spezifisch."**

Nicht "KI für Unternehmen" (zu generisch). Nicht "Fördermittel-Plattform" (zu schwach). Sondern **Legal-Tech mit vertikaler Integration über drei Förder-Ebenen** — und niemand sonst kann das zu diesem Zeitpunkt.

### Tagline

**"Wir machen die Bürokratie."**

Vier Wörter. Das ist der Hero. Das ist was ein Steuerberater in drei Sekunden versteht und weiterträgt.

### Hero-Claim (datenbasiert)

> 3.500+ Programme · EU · Bund · alle 16 Bundesländer · wöchentlich aktualisiert

**Wichtige Korrektur gegenüber Nacht-Sprint-Plan:** Ursprünglich war von **4 Ebenen** (EU, Bund, Land, Gemeinde) die Rede. Empirische Prüfung ergab: **keine Kommune-Daten in D1.** Der Hero-Claim wurde auf 3 Ebenen reduziert, um nicht zu versprechen was nicht geliefert wird.

---

## 2. Kern-Wahrheiten (5) — aus Planning-Session, unverändert gültig

1. **Haftung = Hybrid-C.** KMU haftet rechtlich als Antragsteller. fund24 ist Plattform-Dienstleister (kein Fachmann). Berater haftet zusätzlich für seine eigene fachliche Arbeit. **AGB-Review beim Anwalt als Pre-Launch-Gate** — nicht verhandelbar.
2. **Hero-Story = 3 Ebenen.** EU + Bund + alle 16 Bundesländer. Gemeinde-Ebene aktuell nicht verifiziert abgedeckt, deshalb nicht versprochen.
3. **Berater-Workflow strukturiert** (Multi-Choice, nicht Freitext). RLHF-Constraint, nicht verhandelbar — jede Berater-Entscheidung wird als strukturiertes Event festgehalten für späteres Training.
4. **GEO voll committen ab Tag 1.** Schema.org, atomare Fakten, Q&A-Blöcke, Datum-Marker, fund24-zitierfähig in ChatGPT/Perplexity/Claude. Top-10 Queries pending Keyword-Recherche.
5. **Build-Modus ab Session 1 = Figma-First.** Mocks vor Code. Anti-Pattern: Token-Swap als Redesign verkaufen (Nacht-Sprint-Lesson).

---

## 3. Zwei Personas, zwei getrennte Funnels

### Persona A — KMU (öffentlich, Hauptfunnel)

- **Schmerz:** Zeit + Komplexität + Angst vor Rechtsfehler
- **Ziel:** Herausfinden welche Fördermittel passen, Antrag gestellt bekommen
- **Emotion beim Landing:** ängstlich-hilfesuchend
- **CTA primär:** "Fördercheck starten" (kostenlos, 5 Minuten)
- **Message-Frame:** "Du musst 3.400 Richtlinien nicht kennen. Wir schon."

### Persona B — Berater (gated, Nebenfunnel, eigene Landing-Page)

- **Schmerz:** Mandatsakquise, kein kontinuierlicher Dealflow
- **Ziel:** Qualifizierte Mandate, feste Provision, digitale Tools
- **Emotion beim Landing:** skeptisch-prüfend
- **CTA primär:** "Partner werden" (Application, nicht Auto-Signup)
- **Message-Frame:** "Fixe 9,99% bei Bewilligung. Keine Kaltakquise."

**Kritisch:** Die beiden Funnels verschmelzen nie auf einer Seite. KMU sieht nie Berater-Profile browseable, Berater landen nie in KMU-Flows. Die Homepage ist ausschließlich KMU-Frame.

---

## 4. Geschäftsmodell — exklusiv framen

Die 9,99% Provision ist **nicht "Cost", sondern "Garantie"**:

> "Keine Beratungspauschale. Keine Stundensätze. Kein Vorschuss. Nur Erfolgsprovision — und nur bei Bewilligung."

Anti-Kanzlei. Positionierung gegen klassische Fördermittelberater die 2.000–5.000€ Beratungspauschale + Stundensätze verlangen. Muss in Design + Copy durchgezogen werden.

### Interne Strategie-Note — NICHT PUBLIC

**Berater sind nicht Partner. Berater sind RLHF-Training-Data.**

Jede Korrektur, jede Entscheidung, jede Formulierung die Berater in fund24-Workflows treffen füttert das AI-System. Das Modell lernt, die menschliche Intervention sinkt, langfristig wird der Berater-Anteil minimiert.

**Das wird niemals so kommuniziert.** Berater werden als Partner präsentiert, mit echtem Value (Mandate, Tools, Provision). Die strategische Doppeldeutigkeit bleibt intern.

Konsequenzen fürs Produktdesign:

- Berater-Workflow muss strukturiert, loggable, nachvollziehbar sein (Training-Data-Qualität!)
- Jede Entscheidung die ein Berater trifft muss als strukturiertes Event festgehalten werden, nicht als Freitext
- Über Zeit verschieben sich Berater-Tasks von "viel-Input" zu "Approval-only" (Roadmap-Ziel)

---

## 5. Design-Prinzipien (Leitplanken gegen Kurs-Drift)

### 5.1 Jedes visuelle Element muss "Wir machen die Bürokratie" unterstützen

- Checklisten, Progress-Indikatoren, "erledigt"-States — ja, direkt das Produktversprechen
- Dekorative Gradients, Hero-Illustrationen, Stock-Business-People — nein, Ablenkung
- Funktionale Mini-Demos auf der Homepage — ja, das Produkt SELBST zeigen, nicht beschreiben
- Lange Marketing-Prose — nein, User will tun, nicht lesen

### 5.2 Die Ebenen als zentrales visuelles Paradigma

Der Stack (EU → Bund → Land) ist nicht nur Content. Er ist das **Interaktionsprinzip**.

Hero-Vorschlag (aus Nacht-Handover, anzupassen auf 3 Ebenen):

```
┌─────────────────────────────────────┐
│  EU      HORIZON · LIFE · CEF      │  ← hover: Beispielprogramme
├─────────────────────────────────────┤
│  BUND    BAFA · KfW · ZIM          │  ← hover: Beispielprogramme
├─────────────────────────────────────┤
│  LAND    16 Bundesländer           │  ← hover: dein Land-Picker
└─────────────────────────────────────┘
         ↓ [click any layer]
      Fördercheck startet
```

**Das Hero IST das Produkt-Demo.** Keine separate Hero-Illustration. Die Funktion ist die Visualisierung.

### 5.3 Radikale Klarheit — Linear/Notion/Vercel-Ästhetik

- Max. zwei Farben pro Seite (Neutral + Akzent)
- Clean Sans-Serif für Body (Inter bleibt)
- Serif nur für Editorial/Legal-Sektionen (Impressum, AGB, Datenschutz)
- Generous Whitespace
- Keine Schatten außer funktional (Focus-Ring)
- Radius klein (4–6px), nicht rounded-full außer für Avatare
- Monospace für Referenzen: Programm-IDs, Aktenzeichen, Datumsangaben

### 5.4 Dark Mode ist first-class, nicht retrofitted

Von Anfang an in Figma-Mocks mitgedacht, nicht später "angeschaltet". Wichtigste Lesson der Sovereign-Nacht.

---

## 6. Component Inventory

### 6.1 KEEP (Layout + Logic + shadcn-Base)

- 18 shadcn UI-Components (`components/ui/*`) — Basis ist solide
- Route-Structure (app-directory)
- API-Clients in `lib/api/*`
- Zustand stores (authStore, preCheckStore)
- Middleware, Auth-Flow
- Worker-Backend (`worker/src/*`)

### 6.2 STRIP (alle visuellen Custom-Layers)

- `app/globals.css` — kompletter Token-Reset auf shadcn-Neutral-Defaults (+ doppelte `--background: #737688` aufräumen)
- `app/layout.tsx` — Fonts zurück auf System oder Inter-only
- `app/opengraph-image.tsx` — weg oder placeholder
- Alle `bg-architect-*` Usages in Components (14+ Files)
- Alle 182 raw Tailwind-Palette-Klassen (`bg-gray-900`, `text-blue-800` etc.)
- Alle Gradient-Usages (27 Vorkommen)
- `stitch-export/*` — "Institutional Architect" Design-System, umbenennen nach `_archive/`

### 6.3 REBUILD (nach Strategie-Definition)

- Hero-Komponente (Ebenen-Stack als interaktive Mini-Demo)
- `components/shared/NotificationsBell.tsx`
- `components/foerdercheck/*` (ProgrammKarte, ErgebnisKarte, BeraterMatchKarte)
- `components/layout/Navbar.tsx` + `Footer.tsx`
- `components/antraege/StatusBadge.tsx`
- Email-Templates (`worker/src/services/email.ts`)
- PDF-Report (`lib/pdf/foerdercheck-report.ts`)

### 6.4 NEW (existieren noch nicht)

- Trust-Wall-Section (Impressum-Link, Haftungstext, Zertifikate)
- Berater-Workflow-Interfaces (strukturiert für RLHF-Capture)
- FAQ/HowTo-Pages mit GEO-optimiertem Schema.org Markup
- Lokal-SEO-Pages pro Bundesland

---

## 7. Agent-Orchestration für Implementation

Rollenzuweisung für dieses Projekt:

| Agent | Rolle | Konkrete Tasks |
| :---- | :---- | :---- |
| **Scout** | Research & Intelligence | Competitor-Analyse, SEO-Keyword-Recherche, GEO-Query-Patterns, Rechts-Referenzen |
| **Scribe** | Copy + Content | Page-Wording, Meta-Descriptions, Alt-Texts, Schema.org-Content, Email-Templates, FAQ |
| **Sentinel** | QA + Visual Review | Screenshot-Comparison pro Preview-Deploy, Lighthouse, Accessibility, Contrast-Audits |
| **Ferris** | Dev + Deploy | Component-Implementation, Token-System, Testing, Vercel-Deploys (Preview only!) |
| **Connector** | Integrations | Figma-MCP, GitHub, Vercel-Monitoring |
| **Dispatch** | Project-Management | Progress-Tracking, Blocker-Escalation |

**Fehlender Agent:** "Design Director" — orchestriert Scribe + Ferris bei jeder Komponenten-Entscheidung, verhindert Drift zwischen Copy und Code.

### Hand-off Pattern pro Design-Iteration

```
1. Scout    — liefert Kontext   (competitor-lookups, keyword-signal)
2. Scribe   — liefert Copy      (Headlines, Body, CTA-Labels)
3. Design   — Figma-Mock oder annotated Wireframe
4. Dispatch — Go/No-Go Gate     (passt zu Positionierung?)
5. Ferris   — implementiert     (als Preview-Deploy, niemals Production)
6. Sentinel — Visual-Review     (Screenshots, Contrast, Accessibility)
7. Dispatch — Second Gate       (merge zu main?)
```

Klingt langsam — ist schneller als Sprint → scheitern → Revert → zurück zu null.

---

## 8. Session-1-Plan (konkret)

**Ziel am Ende von Session 1:** Preview-Deploy mit:

1. Neuer Homepage mit 3-Ebenen-Stack-Hero (funktional, nicht nur visuell)
2. Gestripptes `globals.css` auf shadcn-Neutral (+ doppelte `--background`-Definition gefixt)
3. Navbar + Footer in neuer Sprache
4. Alle anderen Routes vorübergehend auf "Coming Soon" — kein Breitenanspruch

**Vorbedingung (Phase 0):** P0.2 + P0.3 grün, sonst blockiert CI jeden PR.

### Reihenfolge

1. **Phase 0 schließen** — Worker-Tests fixen (P0.2), Docs-Check fixen/disablen (P0.3)
2. **Preview-Env-Vars verifizieren** — `NEXT_PUBLIC_SEMANTIC_API_URL` + `NEXT_PUBLIC_FUND24_API_URL` im Preview-Env
3. **feature-Branch anlegen:** `feat/session-1-baseline` von main
4. **globals.css strippen** — shadcn-Neutral als Baseline, doppelte Definition entfernen
5. **Figma-Mock** für Hero/Navbar/Footer (eigentliches Figma, nicht v0)
6. **Ferris implementiert** gegen Mocks, Preview-Deploy
7. **Sentinel Visual-Review** — Screenshots, Contrast, Accessibility
8. **PR öffnen, CI muss grün sein, dann merge**

---

## 9. Offene Fragen — alle geklärt per next-session-handover

| # | Frage | Antwort |
| :---- | :---- | :---- |
| 4.1 | Wer haftet für Korrektheit eines Antrags? | **Hybrid-C:** KMU rechtlich, fund24 = Plattform, Berater zusätzlich für fachliche Arbeit. AGB-Review beim Anwalt = Pre-Launch-Gate. |
| 4.2 | Stimmt die Kommune-Abdeckung? | **Nein.** D1-Check ergab keine Kommune-Daten. Hero-Claim reduziert auf 3 Ebenen (EU/Bund/Land). |
| 4.3 | Berater-Gate-Level? | **Application-Only + strukturiert** (RLHF-Constraint). Kriterien: BAFA-Zertifizierung + 2 Jahre Erfahrung (Richtwert aus Nacht-Handover, final zu bestätigen). |
| 4.4 | SEO/GEO Top-Queries? | **GEO ab Tag 1 committen**, Top-10-Queries pending Keyword-Recherche (eigene Session, nicht jetzt). |
| — | Figma-First oder Code-First? | **Figma-First** ab Session 1. Mocks vor Code. |
| — | Welche Pages zuerst? | **Nur Homepage + Fördercheck-Start** in Session 1. Keine Breitenstrategie. |

---

## 10. Anti-Patterns (7) — Lessons Learned, nicht wiederholen

1. **Nie wieder Token-Swap als Redesign verkaufen.** Tokens sind Farbpaletten-Ebene. Redesign = Tokens + Components + Copy + Layout + Motion + QA. Wochen, nicht Stunden.
2. **Nie wieder `vercel deploy --yes` ohne explizit `--target preview`** (jetzt strukturell geblockt via `~/.zshrc`).
3. **Nie wieder Dark-Mode als Retrofit.** Wenn Dark gewünscht, von Anfang an in Mocks.
4. **Nie wieder Visual-Review überspringen.** "Build grün" ≠ "Design funktioniert".
5. **Nie wieder strategische Klarheit nach Midnight erzwingen wollen.** Positionierung bei Tag, nicht um 02:30.
6. **Nie wieder PR im Auto-Merge-Flow ohne eingerichtete Commit-Policy** (jetzt enforced via P0.1).
7. **Nie wieder Marketing-Namen ("Sovereign Trust Navy") aufdrücken ohne Kundenvalidierung.** Lieber neutral benennen ("v2-Token-System") bis Strategie klar ist.

---

## Appendix — Repo-Referenzen

- **Main Repo:** `github.com/MasterPlayspots/O.A.F24-v2`
- **Frontend:** Next.js 15.5, React 19, Tailwind v4, shadcn/ui (base-nova, neutral baseColor)
- **Backend:** Cloudflare Workers (`worker/`), D1, KV, R2
- **Aktueller Commit auf main:** `ae048e5` (Revert-Commit, pre-Sovereign)
- **Archivierte Sovereign-Arbeit:** Branch `feat/sovereign-design` (nicht gelöscht — Token-Architektur ist wiederverwendbar)

### Vercel

- **Project ID:** `prj_cBF6Mr2U3bClGc4MKyrUhN33TfLw`
- **Team ID:** `team_33RfPgPlk2sfQRPV7exEafNj`
- **Production Alias:** `fund24.io`, `fund24-team-muse-ai.vercel.app`
