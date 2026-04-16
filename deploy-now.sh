#!/usr/bin/env bash
# Fund24 — ein-Klick-Deploy nach Nacht 1-5 Fixes
# Ausführen vom Mac, NICHT aus der Sandbox.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== 1/6 Repo-Check ==="
pwd
git log --oneline -1
[ -f .vercel/project.json ] || { echo "FEHLT: .vercel/project.json"; exit 1; }

echo
echo "=== 2/6 Cleanup von fehlgeleiteten vercel-link Artifakten in HOME ==="
# vorheriger 'vercel link' wurde versehentlich in $HOME ausgeführt und hat
# dort ein .vercel/ und eine .env.local erzeugt (die deine echten Dev-Keys
# überschreiben könnte). Beide gehören NICHT in HOME.
if [ -d "$HOME/.vercel" ] && [ ! -f "$HOME/package.json" ]; then
  echo "entferne $HOME/.vercel"
  rm -rf "$HOME/.vercel"
fi
if [ -f "$HOME/.env.local" ] && [ ! -f "$HOME/package.json" ]; then
  echo "sichere $HOME/.env.local nach $HOME/.env.local.bak-$(date +%s) und entferne Original"
  mv "$HOME/.env.local" "$HOME/.env.local.bak-$(date +%s)"
fi

echo
echo "=== 3/6 Git pull (nur main, fast-forward) ==="
git fetch origin main
git pull --ff-only origin main || true
git log --oneline -1

echo
echo "=== 4/6 Vercel Link (nutzt .vercel/project.json falls vorhanden) ==="
npx --yes vercel@latest link --yes --project fund24 --scope team-muse-ai

echo
echo "=== 5/6 Vercel Deploy --prod --force ==="
DEPLOY_URL=$(npx --yes vercel@latest --prod --force --yes 2>&1 | tee /tmp/fund24-deploy.log | grep -oE 'https://[a-z0-9.-]+\.vercel\.app' | tail -1)
echo "Deploy URL: ${DEPLOY_URL:-<none captured — check /tmp/fund24-deploy.log>}"

echo
echo "=== 6/6 Verifikation ==="
sleep 15
if [ -n "${DEPLOY_URL:-}" ]; then
  echo "Preview-URL:"
  curl -s -o /dev/null -w "  HTTP %{http_code}\n" "$DEPLOY_URL"
fi
echo "fund24.io:"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" https://fund24.io

echo
echo "=== FERTIG ==="
echo "Falls Domain nicht auf neuem Deploy zeigt:"
echo "  https://vercel.com/team-muse-ai/fund24/settings/domains"
echo "  -> fund24.io anhängen, dann HTTP 200 von neuem Commit"
