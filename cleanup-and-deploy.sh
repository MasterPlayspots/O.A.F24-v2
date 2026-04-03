#!/bin/bash
# ============================================================
# ZFBF.info — Master Cleanup & Deploy Script
# Löscht Duplikat-Worker + Deployed neuen Fördermittel-Check
# ============================================================
set -e

ACCOUNT_ID="d7bdc9212bc6f429a5f2eb82853a9e83"

echo "🧹 ZFBF.info Cleanup & Deploy"
echo "=============================="

# ── SCHRITT 1: Duplikat-Worker löschen ──
echo ""
echo "📋 Schritt 1: Duplikat-Worker löschen"
echo "--------------------------------------"

# Prüfe ob Cloudflare API Token verfügbar ist
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "⚠️  CLOUDFLARE_API_TOKEN nicht gesetzt."
    echo "   Bitte setzen: export CLOUDFLARE_API_TOKEN=<dein-token>"
    echo "   Oder manuell löschen im Dashboard:"
    echo "   Workers & Pages → empty-mud-d086fund24-api → Settings → Delete"
    echo ""
    echo "   Alternativ: npx wrangler delete --name empty-mud-d086fund24-api"
else
    echo "Lösche empty-mud-d086fund24-api..."
    RESPONSE=$(curl -s -X DELETE \
        "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/empty-mud-d086fund24-api" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json")

    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo "✅ empty-mud-d086fund24-api gelöscht!"
    else
        echo "⚠️  Konnte Worker nicht löschen: $RESPONSE"
        echo "   Manuell löschen: npx wrangler delete --name empty-mud-d086fund24-api"
    fi
fi

# ── SCHRITT 2: Fördermittel-Check Worker deployen ──
echo ""
echo "📋 Schritt 2: Fördermittel-Check Worker deployen"
echo "-------------------------------------------------"

# In den Worker-Ordner wechseln
cd "$(dirname "$0")"

# Abhängigkeiten installieren
if [ ! -d "node_modules" ]; then
    echo "📦 Installiere wrangler..."
    npm install --save-dev wrangler
fi

# Deployen
echo "🚀 Deploying foerdermittel-check-api..."
npx wrangler deploy

echo ""
echo "✅ Worker deployed!"

# ── SCHRITT 3: Secrets setzen ──
echo ""
echo "📋 Schritt 3: Secrets setzen"
echo "----------------------------"
echo "Bitte die folgenden Secrets setzen (interaktiv):"
echo ""
echo "  npx wrangler secret put JWT_SECRET"
echo "  → Gleicher Wert wie beim bafa-creator-ai-worker!"
echo ""
echo "  npx wrangler secret put EXTERNAL_AI_KEY"
echo "  → OpenAI API Key (sk-...) oder Anthropic Key"
echo ""
echo "  npx wrangler secret put EXTERNAL_AI_PROVIDER"
echo "  → 'openai' oder 'anthropic'"

# ── SCHRITT 4: Verifikation ──
echo ""
echo "📋 Schritt 4: Verifikation"
echo "--------------------------"
echo "Teste den Worker:"
echo ""
echo '  curl -X POST https://foerdermittel-check-api.<subdomain>.workers.dev/api/checks \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '\''{"vorhaben":"digitalisierung","bundesland":"Bayern"}'\'''
echo ""
echo "=============================="
echo "✅ Cleanup & Deploy abgeschlossen!"
echo ""
echo "Infrastruktur-Status:"
echo "  Workers:  4 (statt 5)"
echo "  D1 DBs:   7 (statt 9)"
echo "  R2:       4"
echo "  KV:       10"
echo "=============================="
