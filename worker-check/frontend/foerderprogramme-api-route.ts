/**
 * Next.js API Route: /api/foerderprogramme
 * Datei: app/api/foerderprogramme/route.ts
 *
 * Ersetzt lib/foerderprogramme-data.ts (12 Programme)
 * durch echte Daten aus fund24-api (2.467 Programme)
 *
 * Features:
 * - Volltextsuche
 * - Filter: Gebiet, Art, Bereich
 * - Pagination
 * - Caching (60s)
 */

import { NextRequest, NextResponse } from "next/server";

const FUND24_URL = process.env.NEXT_PUBLIC_FUND24_API_URL
  || "https://fund24-api.kevin-froeba.workers.dev";

// Cache für häufige Abfragen (60 Sekunden)
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 60_000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Query-Parameter übernehmen
  const params = new URLSearchParams();
  const allowedParams = ["gebiet", "art", "bereich", "search", "page", "limit"];
  for (const key of allowedParams) {
    const val = searchParams.get(key);
    if (val) params.set(key, val);
  }

  const cacheKey = params.toString();

  // Cache prüfen
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    // An fund24-api weiterleiten
    const url = `${FUND24_URL}/api/programmes${cacheKey ? "?" + cacheKey : ""}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Förderprogramme konnten nicht geladen werden" },
        { status: res.status }
      );
    }

    const data = await res.json();

    // In Cache speichern
    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });

    // Cache-Größe begrenzen
    if (cache.size > 100) {
      const oldest = Array.from(cache.entries())
        .sort((a, b) => a[1].expires - b[1].expires)[0];
      if (oldest) cache.delete(oldest[0]);
    }

    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    console.error("[Foerderprogramme API]", err);
    return NextResponse.json(
      { error: "fund24-api nicht erreichbar" },
      { status: 502 }
    );
  }
}

// ════════════════════════════════════════════════════════════
// STATS Route: /api/foerderprogramme/stats
// Datei: app/api/foerderprogramme/stats/route.ts
// ════════════════════════════════════════════════════════════

export async function GET_STATS() {
  try {
    const res = await fetch(`${FUND24_URL}/api/stats`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Stats nicht verfügbar" }, { status: 502 });
  }
}

// ════════════════════════════════════════════════════════════
// MIGRATION: foerderprogramme-data.ts → API
//
// VORHER (lib/foerderprogramme-data.ts):
//   export const FOERDERPROGRAMME = [
//     { id: 1, name: "BAFA - Unternehmensberatung", ... },
//     // ... 12 Programme
//   ];
//
// NACHHER (in Page-Komponenten):
//   "use client";
//   import { useEffect, useState } from "react";
//   import { api } from "@/lib/api-client";
//
//   export default function ProgrammePage() {
//     const [programme, setProgramme] = useState([]);
//     const [loading, setLoading] = useState(true);
//
//     useEffect(() => {
//       api.foerderprogramme.list().then(({ data }) => {
//         if (data) setProgramme(data.programmes);
//         setLoading(false);
//       });
//     }, []);
//
//     if (loading) return <Skeleton />;
//     return <ProgrammList items={programme} />;
//   }
// ════════════════════════════════════════════════════════════
