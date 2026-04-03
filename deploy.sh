#!/bin/bash
# ============================================================
# ZFBF.info — Fördermittel-Check API Deployment
# Führt alle Schritte automatisch aus
# ============================================================
set -e

echo "🚀 Fördermittel-Check API Deployment"
echo "====================================="

# 1. Prüfe ob wrangler verfügbar ist
if ! command -v npx &> /dev/null; then
    echo "❌ npx nicht gefunden. Bitte Node.js installieren."
    exit 1
fi

echo ""
echo "📋 Schritt 1: Secrets setzen"
echo "----------------------------"

# JWT_SECRET prüfen/setzen
if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  JWT_SECRET nicht als Env-Variable gesetzt."
    echo "   Bitte manuell setzen:"
    echo "   npx wrangler secret put JWT_SECRET"
    echo "   (Gleicher Key wie bafa-creator-ai-worker!)"
else
    echo "$JWT_SECRET" | npx wrangler secret put JWT_SECRET
    echo "✅ JWT_SECRET gesetzt"
fi

# EXTERNAL_AI_KEY
if [ -z "$EXTERNAL_AI_KEY" ]; then
    echo "⚠️  EXTERNAL_AI_KEY nicht als Env-Variable gesetzt."
    echo "   Bitte manuell setzen:"
    echo "   npx wrangler secret put EXTERNAL_AI_KEY"
else
    echo "$EXTERNAL_AI_KEY" | npx wrangler secret put EXTERNAL_AI_KEY
    echo "✅ EXTERNAL_AI_KEY gesetzt"
fi

# EXTERNAL_AI_PROVIDER
if [ -z "$EXTERNAL_AI_PROVIDER" ]; then
    echo "ℹ️  EXTERNAL_AI_PROVIDER nicht gesetzt, nutze Default: openai"
    echo "openai" | npx wrangler secret put EXTERNAL_AI_PROVIDER
else
    echo "$EXTERNAL_AI_PROVIDER" | npx wrangler secret put EXTERNAL_AI_PROVIDER
    echo "✅ EXTERNAL_AI_PROVIDER gesetzt ($EXTERNAL_AI_PROVIDER)"
fi

echo ""
echo "📋 Schritt 2: Worker deployen"
echo "----------------------------"
npx wrangler deploy
echo "✅ Worker deployed!"

echo ""
echo "📋 Schritt 3: Health Check"
echo "----------------------------"
WORKER_URL=$(npx wrangler whoami 2>/dev/null | grep -o 'https://[^ ]*' || echo "")
if [ -z "$WORKER_URL" ]; then
    echo "ℹ️  Worker-URL prüfen:"
    echo "   curl https://foerdermittel-check-api.<subdomain>.workers.dev/health"
else
    curl -s "$WORKER_URL/health" | head -c 200
fi

echo ""
echo ""
echo "====================================="
echo "✅ Deployment abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "  1. npx wrangler secret put JWT_SECRET   (falls nicht gesetzt)"
echo "  2. npx wrangler secret put EXTERNAL_AI_KEY"
echo "  3. Teste: curl -X POST https://<worker-url>/api/checks \\"
echo "       -H 'Content-Type: application/json' \\"
echo '       -d '\''{"vorhaben":"digitalisierung","bundesland":"Bayern"}'\'
echo "====================================="
