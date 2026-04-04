# fund24 — Claude Code Deploy Prompt

Kopiere den folgenden Prompt komplett in Claude Code im Terminal:

---

```
Du bist im fund24 Projekt-Ordner. Führe folgende Schritte der Reihe nach aus. Stoppe bei Fehlern und berichte.

## 1. Git → GitHub Push

Das Projekt hat bereits einen Git-Commit. Pushe es zum GitHub Repo:

git remote add origin https://github.com/MasterPlayspots/O.A.F24.git
git branch -M main
git push -u origin main

Falls der Remote schon existiert, überspringe `git remote add`.

## 2. Vercel Environment Variables setzen

Setze diese 5 Environment Variables auf dem Vercel-Projekt "fund24" (Team: MuseAi, team_33RfPgPlk2sfQRPV7exEafNj, Project ID: prj_cBF6Mr2U3bClGc4MKyrUhN33TfLw).

Nutze `vercel env add` oder die Vercel API:

| Variable | Wert |
|---|---|
| NEXT_PUBLIC_CHECK_API_URL | https://foerdermittel-check-api.froeba-kevin.workers.dev |
| NEXT_PUBLIC_FUND24_API_URL | https://fund24-api.froeba-kevin.workers.dev |
| NEXT_PUBLIC_SEMANTIC_API_URL | https://fund24-semantic-search.froeba-kevin.workers.dev |
| NEXT_PUBLIC_ZFBF_API_URL | https://zfbf-api.froeba-kevin.workers.dev |
| NEXT_PUBLIC_APP_URL | https://fund24-team-muse-ai.vercel.app |

Jede Variable muss für Production, Preview UND Development gesetzt werden.

## 3. Vercel mit GitHub verbinden

Verbinde das Vercel-Projekt "fund24" mit dem GitHub Repo "MasterPlayspots/O.A.F24":

vercel link
vercel git connect

Oder über die Vercel API / Dashboard: Project Settings → Git → Connect Git Repository → MasterPlayspots/O.A.F24

## 4. Production Deploy

vercel --prod

Oder triggere den Deploy über den GitHub-Push (wenn Git connected ist).

## 5. Cloudflare Worker Secrets

Setze das JWT_SECRET auf dem Worker "foerdermittel-check-api":

echo "f9f3d8a0553d3cf121b8530112fd9e2afd07c94a52aee0d92863a4bf43bafe62" | wrangler secret put JWT_SECRET --name foerdermittel-check-api

## 6. Verifizierung

- Prüfe ob https://fund24-team-muse-ai.vercel.app erreichbar ist
- Prüfe ob die API-Endpoints antworten (curl https://foerdermittel-check-api.froeba-kevin.workers.dev/health)
- Berichte den Status jedes Schritts

WICHTIG: Führe jeden Schritt einzeln aus und logge das Ergebnis. Bei Fehlern stoppe und erkläre was schiefging.
```

---

## Noch manuell zu erledigen (NACH dem Deploy):

1. **Anthropic API Key rotieren**: https://console.anthropic.com/settings/keys → Alten Key löschen → Neuen erstellen → Als Worker Secret setzen:
   ```
   echo "NEUER_KEY" | wrangler secret put ANTHROPIC_API_KEY --name foerdermittel-check-api
   ```

2. **Resend einrichten** (für E-Mail-Versand):
   - Account: https://resend.com/signup
   - Domain `fund24.io` verifizieren (DNS Records)
   - API Key generieren → Als Worker Secret setzen:
   ```
   echo "re_DEIN_KEY" | wrangler secret put RESEND_API_KEY --name foerdermittel-check-api
   echo "noreply@fund24.io" | wrangler secret put RESEND_FROM_EMAIL --name foerdermittel-check-api
   ```
