#!/bin/bash
# ============================================================
# Deploy foerdermittel-check-api v3.0
# Full Platform: Check + Agents + Matching + Anfragen + Dashboards
# ============================================================

set -e

echo "🚀 Deploying foerdermittel-check-api v3.0..."
echo ""

# Step 1: Deploy Worker
echo "📦 Step 1: Deploy Worker..."
npx wrangler deploy

echo ""
echo "✅ Worker deployed!"
echo ""

# Step 2: Verify
echo "🔍 Step 2: Verify deployment..."
echo "   Testing health endpoint..."
curl -s "https://foerdermittel-check-api.froeba-kevin.workers.dev/health" | jq .
echo ""

echo "📊 API Endpoints (v3.0):"
echo "   ┌─────────────────────────────────────────────────────────────────────┐"
echo "   │ FÖRDERMITTEL-CHECK                                                 │"
echo "   │ POST /api/checks              – Neuen Check starten               │"
echo "   │ POST /api/checks/:id/chat     – Chat-Nachricht senden             │"
echo "   │ POST /api/checks/:id/docs     – Dokument hochladen                │"
echo "   │ POST /api/checks/:id/analyze  – KI-Analyse starten                │"
echo "   │ POST /api/checks/:id/optimize – KI-Agenten Optimierung            │"
echo "   │ GET  /api/checks/:id          – Check-Ergebnis abrufen            │"
echo "   │ GET  /api/checks/:id/plan     – Aktionsplan abrufen               │"
echo "   │ GET  /api/checks/:id/berater  – Berater-Empfehlung                │"
echo "   │ PATCH /api/checks/:id/plan/:s – Plan-Schritt aktualisieren        │"
echo "   │ GET  /api/checks              – Eigene Checks (Auth)              │"
echo "   ├─────────────────────────────────────────────────────────────────────┤"
echo "   │ FÖRDERPROGRAMME                                                    │"
echo "   │ GET  /api/foerderprogramme         – Browse & Suche               │"
echo "   │ GET  /api/foerderprogramme/stats   – Statistiken                  │"
echo "   │ GET  /api/foerderprogramme/:id     – Programm-Detail              │"
echo "   ├─────────────────────────────────────────────────────────────────────┤"
echo "   │ BERATER-MATCHING                                                   │"
echo "   │ GET  /api/matching/berater         – Berater suchen/matchen       │"
echo "   │ GET  /api/matching/berater/:id     – Berater-Profil               │"
echo "   │ GET  /api/dienstleistungen         – Alle Dienstleistungen        │"
echo "   ├─────────────────────────────────────────────────────────────────────┤"
echo "   │ ANFRAGEN (Auth required)                                           │"
echo "   │ POST /api/anfragen                 – Berater-Anfrage senden       │"
echo "   │ PATCH /api/anfragen/:id            – Status ändern                │"
echo "   │ GET  /api/anfragen                 – Eigene Anfragen              │"
echo "   ├─────────────────────────────────────────────────────────────────────┤"
echo "   │ BERATER-PROFIL (Auth required)                                     │"
echo "   │ GET  /api/berater/profil           – Eigenes Profil               │"
echo "   │ PUT  /api/berater/profil           – Profil bearbeiten            │"
echo "   │ POST /api/berater/dienstleistungen – Dienstleistung anlegen       │"
echo "   │ PUT  /api/berater/dienstleistungen/:id – DL bearbeiten           │"
echo "   │ POST /api/berater/expertise        – Expertise hinzufügen         │"
echo "   ├─────────────────────────────────────────────────────────────────────┤"
echo "   │ DASHBOARDS (Auth required)                                         │"
echo "   │ GET  /api/dashboard/unternehmen    – Unternehmen-Dashboard        │"
echo "   │ GET  /api/dashboard/berater        – Berater-Dashboard            │"
echo "   ├─────────────────────────────────────────────────────────────────────┤"
echo "   │ FAVORITEN & BEWERTUNGEN (Auth required)                            │"
echo "   │ POST /api/favoriten                – Merken/Entmerken             │"
echo "   │ GET  /api/favoriten                – Favoriten-Liste              │"
echo "   │ POST /api/bewertungen              – Berater bewerten             │"
echo "   │ POST /api/buchungen                – Beratung buchen              │"
echo "   ├─────────────────────────────────────────────────────────────────────┤"
echo "   │ SYSTEM                                                             │"
echo "   │ GET  /health                       – Health Check                  │"
echo "   └─────────────────────────────────────────────────────────────────────┘"
echo ""
echo "🎉 Deployment complete! 30 Endpoints, 2,954 Zeilen Code"
