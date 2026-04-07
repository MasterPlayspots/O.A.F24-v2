# Backend Wiring Map — Coming Soon Routes

Stand: 2026-04-07

## /(public)/aktuelles + /aktuelles/[slug]
**Backend benötigt:**
- `D1.PLATFORM_DB.aktuelles`: id, slug, title, excerpt, body_md, cover_url, published_at, author_id
- Worker: GET /api/aktuelles, GET /api/aktuelles/:slug
- Admin CRUD via /admin/aktuelles

## /(public)/berater + /berater/[id]
**Backend benötigt:**
- `D1.PLATFORM_DB.berater_profiles`: user_id, slug, headline, expertise[], bio_md, hourly_rate, languages[], regions[], rating_avg, rating_count, verified
- Worker: GET /api/berater?expertise&region&search, GET /api/berater/:id, POST /api/berater/:id/anfrage

## /admin/* (admin, aktuelles, provisionen, users)
**Backend benötigt (alle role=admin):**
- GET/POST/PATCH/DELETE /api/admin/users
- GET/POST/PATCH/DELETE /api/admin/aktuelles
- GET /api/admin/provisionen?from&to, POST /api/admin/provisionen/auszahlung
- `provisionen` Tabelle: id, berater_id, anfrage_id, betrag_cent, status, created_at, paid_at

## /dashboard/berater/* (anfragen, abwicklung, nachrichten, profil, tracker)
**Backend benötigt (auth role=berater):**
- `anfragen`, `nachrichten`, `mandate` Tabellen
- GET /api/berater/me/anfragen?status
- GET/POST /api/berater/me/nachrichten/:anfrage_id
- GET /api/berater/me/mandate, PATCH /api/berater/me/mandate/:id
- GET/PATCH /api/berater/me/profile
- GET /api/berater/me/tracker

## /dashboard/unternehmen/anfragen
- `anfragen` Tabelle: id, unternehmen_id, berater_id, foerderprogramm_id, betreff, beschreibung, status, created_at
- GET /api/unternehmen/me/anfragen?status

## /dashboard/unternehmen/favoriten
- `favoriten`: user_id, programm_id, created_at
- GET/POST/DELETE /api/unternehmen/me/favoriten

## /dashboard/unternehmen/tracker
- `antraege`: id, unternehmen_id, programm_id, phase, eingereicht_at, entscheidung_at, foerdersumme_cent
- GET/POST/PATCH /api/unternehmen/me/antraege

## Live & verkabelt (KEIN Banner)
- /, /programme, /programme/[id], /foerder-schnellcheck/*, /(auth)/*, /preise, /agb, /datenschutz, /impressum, /support, /dashboard/unternehmen, /onboarding/*
