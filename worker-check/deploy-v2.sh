#!/bin/bash
# ============================================================
# Deploy foerdermittel-check-api v2.0
# Includes: Fördermittel-Check + Berater-Matching + Förderprogramme-Browse
# ============================================================

set -e

echo "🚀 Deploying foerdermittel-check-api v2.0..."
echo ""

# Step 1: Deploy Worker
echo "📦 Step 1: Deploy Worker..."
npx wrangler deploy

echo ""
echo "✅ Worker deployed!"
echo ""

# Step 2: Set secrets (only if not already set)
echo "🔐 Step 2: Set secrets..."
echo "   Run these commands if not already set:"
echo ""
echo "   npx wrangler secret put JWT_SECRET"
echo "   npx wrangler secret put EXTERNAL_AI_KEY"
echo "   npx wrangler secret put EXTERNAL_AI_PROVIDER"
echo ""

# Step 3: Delete duplicate worker
echo "🧹 Step 3: Cleanup duplicate worker..."
echo "   npx wrangler delete --name empty-mud-d086fund24-api"
echo ""

# Step 4: Verify
echo "🔍 Step 4: Verify deployment..."
WORKER_URL=$(npx wrangler deploy --dry-run 2>&1 | grep -oP 'https://[^\s]+' | head -1 || echo "https://foerdermittel-check-api.*.workers.dev")
echo "   Testing health endpoint..."
curl -s "${WORKER_URL}/health" | jq .
echo ""

echo "📊 API Endpoints (v2.0):"
echo "   ┌─────────────────────────────────────────────────────────────────────┐"
echo "   │ FÖRDERMITTEL-CHECK                                                 │"
echo "   │ POST /api/checks              – Neuen Check starten               │"
echo "   │ POST /api/checks/:id/chat     – Chat-Nachricht senden             │"
echo "   │ POST /api/checks/:id/docs     – Dokument hochladen                │"
echo "   │ POST /api/checks/:id/analyze  – KI-Analyse starten                │"
echo "   │ GET  /api/checks/:id          – Check-Ergebnis abrufen            │"
echo "   │ GET  /api/checks/:id/plan     – Aktionsplan abrufen               │"
echo "   │ PATCH /api/checks/:id/plan/:s – Plan-Schritt aktualisieren        │"
echo "   │ GET  /api/checks              – Eigene Checks (Auth required)     │"
echo "   ├─────────────────────────────────────────────────────────────────────┤"
echo "   │ FÖRDERPROGRAMME                                                    │"
echo "   │ GET  /api/foerderprogramme         – Browse & Suche               │"
echo "   │ GET  /api/foerderprogramme/stats   – Statistiken                  │"
echo "   │ GET  /api/foerderprogramme/:id     – Programm-Detail              │"
echo "   ├─────────────────────────────────────────────────────────────────────┤"
echo "   │ BERATER-MATCHING                                                   │"
echo "   │ GET  /api/matching/berater         – Berater suchen/matchen       │"
echo "   │ GET  /api/matching/berater/:id     – Berater-Profil               │"
echo "   ├─────────────────────────────────────────────────────────────────────┤"
echo "   │ SYSTEM                                                             │"
echo "   │ GET  /health                       – Health Check                  │"
echo "   └─────────────────────────────────────────────────────────────────────┘"
echo ""
echo "🎉 Deployment complete!"
