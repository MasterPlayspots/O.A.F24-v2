# fund24 — Pre-Session-1 Readiness

**Erstellt:** 2026-04-19 (nach empirischer Verifikation Phase 0 geschlossen, PR #46 grün)
**Zweck:** Planungs-Lücken dokumentieren die Session 1 blockieren oder deren Scope/Risiko unklar lassen. Diese Fragen müssen **vor** der nächsten Cowork-Sitzung beantwortet sein, sonst läuft Session 1 in dieselbe Art Unklarheit wie die Sovereign-Nacht.

---

## 0. Kontext

Phase 0 ist tot. CI-Pipeline wieder funktional. Strategy-Bundle im Repo. Die Strategy-Docs lesen sich ready-to-execute — aber empirische Prüfung gegen das tatsächliche Repo zeigt Scope-Realitäten und Widersprüche die in den Handovers nicht explizit sind. Dieses Dokument hält sie fest.

Relevante Vorgänger:

- `strategy-handover.md` — Nacht-Sprint-Post-Mortem, Sektion 6 (Component-Inventory)
- `strategy-plan.md` — Synthese, Sektion 8 (Session-1-Plan)
- `next-session-handover.md` — Post-Revert-Update mit 5 Kern-Wahrheiten

---

## 1. Scope-Realität: globals.css / architect-Cleanup

**Was die Strategy-Plan sagt:**

> Alle `bg-architect-*` Usages in Components (14+ Files)

**Was der empirische Grep zeigt:**

- **66 Files** (nicht 14+) enthalten `architect-`-Klassen
- **616 einzelne Usages** über `app/` und `components/`
- Architect-Tokens sind in `app/globals.css` als `--color-architect-*` Variablen **definiert**, nicht nur referenziert

**Implikation:** "globals.css strippen" ist kein einzelner File-Cleanup sondern ein Cascade. Entfernung der Tokens zwingt jedes der 66 Files zu Anpassung oder Stubbing. Das ist mehrere Tage Arbeit, nicht "ein Tag Session 1".

**Entscheidung nötig:** Wird die Session-1-Ziel-Definition angepasst (realistischer) oder bleibt sie knapp aber mit akzeptiertem Scope-Overflow?

---

## 2. "Coming Soon"-Strategie für 55 Non-Homepage-Routes

**Was die Strategy-Plan sagt:**

> Alle anderen Routes vorübergehend auf "Coming Soon" — kein Breitenanspruch

**Repo-Realität:** 56 Route-Pages (`page.tsx`-Files). Wenn Homepage neu ist, betrifft "vorübergehend auf Coming Soon" 55 andere Seiten.

**Drei Lesarten mit Faktor-10-Aufwandsunterschied:**

| Lesart | Scope | Risiko |
| :---- | :---- | :---- |
| **Radikal** | 55 `page.tsx` auf `<ComingSoon/>`-Stub ersetzen | Echte User verlieren Funktionalität (Auth, Fördercheck, Dashboards). Möglich dass aktive Berater oder Betatester das merken. |
| **Pragmatisch** | Homepage neu, andere 55 Routes behalten architect-Styling | Visuelle Inkonsistenz während Transition. User navigieren von neu-Design zu alt-Design. |
| **Hybrid** | KMU-Flows (Auth, Fördercheck) restyled; Admin + Berater-Dashboards stubbed | Mittlerer Scope, mittleres User-Risiko. |

**Entscheidung nötig:** Welche Lesart. Ohne diese Entscheidung kann Session 1 weder scoped noch terminiert werden.

---

## 3. Widerspruch: Kommune-Picker vs. 3-Ebenen-Hero

**Handover-Stand:**

- `strategy-handover.md` §6.4 listet **Kommune-Picker-UI** als NEW-Komponente, Begründung: "das ist die USP — das hat niemand sonst"
- `next-session-handover.md` Kern-Wahrheit 2: Hero auf **3 Ebenen reduziert** weil keine Kommune-Daten in D1

**Konflikt:** Wenn keine Kommune-Daten existieren, macht ein Kommune-Picker keinen Sinn.

**Zwei mögliche Auflösungen:**

- **Droppen:** Kommune-Picker aus der NEW-Roadmap streichen. Hero bleibt 3 Ebenen. Moat-Argument "vertikale 4-Ebenen-Integration" wird zu "vertikale 3-Ebenen-Integration".
- **Daten beschaffen:** Kommune-Daten als eigener Workstream vor Session 3/4 ergänzen. Dann kann 4-Ebenen-Versprechen zurückkehren. Aufwand: unbekannt, typischerweise API-Integration oder manuelles Scraping.

**Entscheidung nötig:** Ohne Auflösung bleibt `components/foerdercheck/` Roadmap inkohärent.

---

## 4. Figma-Tooling ungeklärt

**Was die Strategy-Plan sagt:**

> Figma-First ab Session 1. Mocks vor Code. Eigentliches Figma, nicht v0.

**Was offen ist:**

- Existiert ein fund24-Figma-File bereits? Welches Team/Account?
- Wenn nein: wer designt die Mocks? Noah selbst, externer Designer, Claude via Figma-MCP?
- Gibt es recoverable Design-Work im Branch `feat/sovereign-design` der als Token-Architektur-Referenz dient?

**Implikation:** "Figma-First" ist keine Methodik-Präferenz sondern ein **Blocker**. Ohne Figma-Zugang + Mock-Produzent startet Session 1 nicht.

**Entscheidung nötig:**

- Figma-Account-Status
- Owner des Mock-Produktions-Schritts im Hand-off-Pattern

---

## 5. "Design Director" Rolle nicht besetzt

**Was die Strategy-Plan sagt (Sektion 7):**

> Fehlender Agent: "Design Director" — orchestriert Scribe + Ferris bei jeder Komponenten-Entscheidung, verhindert Drift zwischen Copy und Code.

**Und das Hand-off Pattern hat 7 Schritte mit Schritt 3 "Design — Figma-Mock" und Schritt 4 "Dispatch — Go/No-Go Gate".**

Wenn der Design Director nicht definiert ist, hat das Pattern keine Besitzer für die Design-Integration. Schritt 3 fällt ins Leere.

**Zwei Auflösungen:**

- **Menschliche Rolle:** Noah selbst ist Design Director (Solo-Projekt). Rolle wird explizit umbenannt zu "Noah's Design-Review-Gate".
- **Claude-Agent:** Ein dedizierter System-Prompt oder MCP-basierter Agent übernimmt. Braucht Definition.

**Entscheidung nötig:** Wer/was macht Design-Koordination.

---

## 6. AGB-Review-Timing nicht definiert

**Kern-Wahrheit 1:**

> AGB-Review beim Anwalt als Pre-Launch-Gate, nicht verhandelbar.

**Was fehlt:** "Pre-Launch" ist semantisch offen. Drei Lesarten:

- **Streng:** Vor jedem Production-Push jeder Art
- **Mild:** Vor Public-Launch des neuen Designs (nach Session 3/Pre-Launch-Phase)
- **Sehr mild:** Vor der ersten externen Kundenakquise-Kampagne

**Implikation:** Ohne Timing-Definition könnte AGB-Review als "nicht dran" durchgeschleift werden und dann plötzlich Session 5 (Pre-Launch Gate in Roadmap) blockieren — zu spät um den Anwalt-Termin zeitgerecht zu bekommen.

**Entscheidung nötig:** Wann wird der AGB-Review getriggert. Empfohlen: beim Start von Session 3 (Content + SEO/GEO), damit bis Pre-Launch-Gate Zeit für Iterationen ist.

---

## 7. Operative Loose End: 14 stuck PRs

**Aus der GitHub-Sidebar:** 14 offene PRs. Mit Phase 0 geschlossen sind diese jetzt theoretisch mergebar — aber wahrscheinlich zur Hälfte obsolet:

- Vor-Sovereign-Design-Arbeit wird nach Pfad A verworfen
- Einige sind reine Dependency-Updates (typisch Dependabot)
- Einige könnten echte Fixes sein die für Session 1 relevant sind

**Status ungeprüft bedeutet mentales Budget.** Gehört triaged.

**Empfohlener Ansatz:**

- Einmal durch alle 14 Titel scannen
- Pro PR kategorisieren: merge-ready / rebase-needed / obsolete-close / investigate
- Obsolete sofort schließen mit kurzem Kommentar
- Merge-ready durchziehen
- Rest in Backlog mit Label

Kein Blocker für Session 1 aber wert vor Session 1 zu klären.

---

## Priorisierungs-Tabelle

| # | Decision | Blockt Session 1? | Impact | Aufwand Entscheidung |
| :----: | :---- | :----: | :---- | :----: |
| 1 | Scope-Lesart für "Coming Soon" | Ja | **Groß** — 10× Scope-Unterschied | 10 min |
| 2 | Figma-Zugang + Mock-Owner | Ja | **Blocker** | 30 min Klärung |
| 3 | Kommune-Picker Drop oder Daten beschaffen | Nein (erst Session 2/3) | Mittel | 15 min |
| 4 | AGB-Review-Timing | Nein (erst Session 3+) | Mittel (vermeidet Later-Stage-Blocker) | 15 min |
| 5 | Design-Director Owner | Ja | Mittel | 10 min |
| 6 | 14 PRs triagen | Nein | Klein aber mental-entlastend | 30-45 min Ausführung |
| 7 | globals.css-Scope realistisch definieren | Ja | Hängt mit #1 zusammen | 10 min |

**Kritischer Pfad zu Session 1:** Entscheidungen #1, #2, #5, #7 müssen vor Session-1-Start beantwortet sein. #3 und #4 können parallel entschieden werden. #6 ist nice-to-have.

---

## Empfohlene Vorgehensweise

**Eine dedizierte Decision-Session** (60-90 min, eigene Cowork-Sitzung), die ausschließlich diese sieben Entscheidungen trifft und dokumentiert. Kein Code, keine Implementation. Output: Updates an `strategy-plan.md` und dieses Dokument mit Entscheidungen und Rationale.

Danach ist Session 1 wirklich ready:

- Scope klar (Lesart + realistische globals.css-Grenzen)
- Figma-Flow klar (wer macht Mocks, welches Tool)
- Design-Director klar (wer gated)
- Kommune-Kontradiktion aufgelöst
- AGB-Review-Termin im Kalender
- 14 PRs triaged (optional, aber ideal)

**Anti-Pattern zu vermeiden:** "Wir klären das während Session 1 implicit". Das ist genau der Grund warum die Sovereign-Nacht scheiterte. Entscheidungen vor Implementation, nicht in Implementation.

---

## Next Action

1. Dieses Dokument committen als dauerhafter Planungs-Anker
2. Decision-Session terminieren (idealerweise bald, solange Kontext frisch)
3. Nach Decision-Session: `strategy-plan.md` und `next-session-handover.md` mit den Antworten updaten
4. Erst dann `feat/session-1-baseline` Branch anlegen und Implementation starten
