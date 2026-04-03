"use client";

import { useEffect, useState } from "react";

// ═══ TYPES ═══
interface User {
  id: string;
  name: string;
  email: string;
  role: "berater" | "unternehmen" | "admin";
}

interface Report {
  id: string;
  title: string;
  status: "entwurf" | "generiert" | "finalisiert";
  kunde_name: string;
  branche: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  berichte: number;
  kunden: number;
  programme: number;
  tracker: number;
}

// ═══ CONFIG ═══
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const API_BASE = process.env.NEXT_PUBLIC_WORKER_URL || "";

// ═══ MOCK DATA ═══
const MOCK_USER: User = { id: "1", name: "Max Mustermann", email: "max@example.com", role: "berater" };
const MOCK_STATS: DashboardStats = { berichte: 6, kunden: 4, programme: 12, tracker: 3 };
const MOCK_REPORTS: Report[] = [
  { id: "1", title: "BAFA-Bericht Digitalisierung GmbH", status: "finalisiert", kunde_name: "Digitalisierung GmbH", branche: "IT", created_at: "2026-02-28", updated_at: "2026-03-01" },
  { id: "2", title: "BAFA-Bericht Müller Consulting", status: "generiert", kunde_name: "Müller Consulting", branche: "Beratung", created_at: "2026-02-25", updated_at: "2026-02-26" },
  { id: "3", title: "BAFA-Bericht Handwerk Plus", status: "entwurf", kunde_name: "Handwerk Plus e.K.", branche: "Handwerk", created_at: "2026-02-20", updated_at: "2026-02-20" },
];

// ═══ API HELPERS ═══
async function fetchAPI<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ═══ COMPONENTS ═══

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function StatCard({ label, value, icon, color, loading }: {
  label: string; value: number | string; icon: string; color: string; loading: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          )}
        </div>
        <div className={`text-3xl opacity-20`}>{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    entwurf: "bg-gray-100 text-gray-700",
    generiert: "bg-blue-100 text-blue-700",
    finalisiert: "bg-green-100 text-green-700",
  };
  const labels: Record<string, string> = {
    entwurf: "Entwurf",
    generiert: "Generiert",
    finalisiert: "Finalisiert",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100"}`}>
      {labels[status] || status}
    </span>
  );
}

function QuickAction({ href, icon, label, description }: {
  href: string; icon: string; label: string; description: string;
}) {
  return (
    <a href={href} className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-gray-900 group-hover:text-blue-700">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </a>
  );
}

// ═══ MAIN COMPONENT ═══
export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(DEMO_MODE ? MOCK_USER : null);
  const [stats, setStats] = useState<DashboardStats | null>(DEMO_MODE ? MOCK_STATS : null);
  const [reports, setReports] = useState<Report[]>(DEMO_MODE ? MOCK_REPORTS : []);
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return;

    const load = async () => {
      const [userData, reportsData] = await Promise.all([
        fetchAPI<User>("/api/auth/session"),
        fetchAPI<Report[]>("/api/bafa/reports"),
      ]);

      if (userData) setUser(userData);
      if (reportsData) {
        setReports(reportsData);
        setStats({
          berichte: reportsData.length,
          kunden: new Set(reportsData.map(r => r.kunde_name)).size,
          programme: 0, // wird separat geladen
          tracker: 0,
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* ── Welcome ── */}
      <div>
        {loading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}, {user?.name?.split(" ")[0] || "Willkommen"}!
          </h1>
        )}
        <p className="text-gray-500 mt-1">
          Hier ist Ihre aktuelle Übersicht.
        </p>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Berichte" value={stats?.berichte ?? 0} icon="📄" color="text-blue-700" loading={loading} />
        <StatCard label="Kunden" value={stats?.kunden ?? 0} icon="👥" color="text-green-700" loading={loading} />
        <StatCard label="Programme gespeichert" value={stats?.programme ?? 0} icon="📋" color="text-purple-700" loading={loading} />
        <StatCard label="Aktive Tracker" value={stats?.tracker ?? 0} icon="📊" color="text-orange-600" loading={loading} />
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Schnellzugriff</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickAction href="/dashboard/berichte/neu" icon="✏️" label="Neuer Bericht" description="BAFA-Bericht mit KI erstellen" />
          <QuickAction href="/dashboard/kunden/neu" icon="👤" label="Neuer Kunde" description="Kunde anlegen" />
          <QuickAction href="/foerdermittel-check" icon="🔍" label="Fördermittel-Check" description="Passende Programme finden" />
          <QuickAction href="/dashboard/netzwerk" icon="🤝" label="Netzwerk" description="Berater durchsuchen" />
        </div>
      </div>

      {/* ── Recent Reports ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Letzte Berichte</h2>
          <a href="/dashboard/berichte" className="text-sm text-blue-600 hover:underline">Alle anzeigen →</a>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 divide-y">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="p-4 flex items-center gap-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20 ml-auto" />
              </div>
            ))
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">Noch keine Berichte vorhanden</p>
              <p className="mt-1 text-sm">Erstellen Sie Ihren ersten BAFA-Bericht mit KI-Unterstützung.</p>
              <a href="/dashboard/berichte/neu" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Ersten Bericht erstellen
              </a>
            </div>
          ) : (
            reports.slice(0, 5).map(report => (
              <a key={report.id} href={`/dashboard/berichte/${report.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{report.title}</p>
                  <p className="text-sm text-gray-500">{report.kunde_name} · {report.branche}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <StatusBadge status={report.status} />
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(report.updated_at).toLocaleDateString("de-DE")}
                  </span>
                </div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* ── Fördermittel-Check Teaser ── */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">KI-Fördermittel-Check</h3>
            <p className="text-blue-700 mt-1 max-w-xl">
              Finden Sie in 5 Minuten passende Förderprogramme für Ihre Kunden.
              Unser KI-Agent prüft Kombinierbarkeit und erstellt einen Aktionsplan.
            </p>
            <a href="/foerdermittel-check" className="inline-block mt-3 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
              Jetzt Fördercheck starten →
            </a>
          </div>
          <span className="text-5xl opacity-30 hidden sm:block">🎯</span>
        </div>
      </div>

      {/* ── Demo Mode Banner ── */}
      {DEMO_MODE && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <p className="text-sm text-amber-700">
            <strong>Demo-Modus aktiv</strong> — Die angezeigten Daten sind Beispieldaten.
            Verbinden Sie den Worker für Live-Daten.
          </p>
        </div>
      )}
    </div>
  );
}
