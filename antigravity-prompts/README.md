# Antigravity Nacht-Prompts — fund24 Audit Implementierung

## Reihenfolge (STRIKT SEQUENTIELL — eine Nacht nach der anderen!)

| Nacht | Branch | Dauer | Inhalt | PRs davor mergen? |
|---|---|---|---|---|
| **1** | `fix/nacht1-security-frontend-ux` | ~3h | Security + Frontend UX (Phase 2+3) | Phase A PR mergen |
| **2** | `fix/nacht2-navigation-metadata` | ~2-3h | Navigation + Metadata + Legal (Phase 4) | Nacht 1 PR mergen |
| **3** | `fix/nacht3-backend-hardening` | ~3-4h | Backend + DB Indexes (Phase 5) | Nacht 2 PR mergen |
| **4** | `fix/nacht4-schema-consolidation` | ~4-6h | Schema Consolidation ⚠️ (Phase 6) | Nacht 3 PR mergen |
| **5** | `fix/nacht5-features-cleanup` | ~2-3h | Features + Dead Code (Phase 7+8) | Nacht 4 PR mergen + Migrations anwenden |

## So geht's

1. Öffne Claude Code / Antigravity
2. Aktiviere **"Edit automatically"** (Toggle oben rechts)
3. Paste den Inhalt der jeweiligen Nacht-Datei als Prompt
4. Lass laufen — committed, pushed und erstellt PR automatisch
5. Am nächsten Morgen: PR reviewen, mergen, nächste Nacht starten

## ⚠️ Wichtig

- **Nacht 4 ist KRITISCH** — enthält die Users-Table-Migration. PR NICHT blind mergen!
  - Erst auf Staging testen
  - Auth-Flow manuell verifizieren
  - Dann `wrangler d1 migrations apply` auf Production

- **Nacht 5 Drop-Tables** sind AUSKOMMENTIERT
  - Erst nach 48h fehlerfreiem Betrieb uncommenten

- Jede Nacht brancht von `main` — vorherige PR muss GEMERGT sein

## Gesamtaufwand

| Phase | Tasks | Findings |
|---|---|---|
| A ✅ | 6 | H-P1-01 bis H-P1-05 + G-P5-01 |
| Nacht 1 | 17 | Security + Frontend UX |
| Nacht 2 | 10 | Navigation + Metadata + Legal |
| Nacht 3 | 12 | Backend + DB Indexes |
| Nacht 4 | 3 | Schema Consolidation (kritisch) |
| Nacht 5 | 12 | Features + Dead Code |
| **Total** | **60** | **121 Findings adressiert** |
