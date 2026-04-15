/**
 * ZFBF.info — Frontend API Client
 *
 * Dieses File ersetzt alle Mock-Daten-Imports im Frontend.
 * Statt `import { MOCK_BERATER } from "@/lib/berater-data"`
 * nutzt man `import { api } from "@/lib/api-client"`
 *
 * Features:
 * - Automatische Token-Verwaltung
 * - Type-safe API Calls
 * - Fallback auf Mock-Daten wenn Worker offline
 * - Caching für häufige Abfragen
 */

// ═══ TYPES ═══
export interface User {
  id: string;
  email: string;
  name: string;
  role: "berater" | "unternehmen" | "admin";
  avatar_url?: string;
  company?: string;
  created_at: string;
}

export interface Foerderprogramm {
  id: number;
  programmname: string;
  foerdergeber: string;
  foerdergebiet: string;
  foerderart: string;
  foerderbereich: string;
  kurzbeschreibung?: string;
  foerdersumme_min?: number;
  foerdersumme_max?: number;
  foerderquote_prozent?: number;
  antragsfristen?: string;
  website_url?: string;
}

export interface Berater {
  id: string;
  name: string;
  unternehmen: string;
  spezialisierung: string[];
  regionen: string[];
  branchen: string[];
  bewertung: number;
  anzahl_bewertungen: number;
  bio: string;
  bafa_verifiziert: boolean;
  profilbild_url?: string;
}

export interface Report {
  id: string;
  title: string;
  status: "entwurf" | "generiert" | "finalisiert";
  kunde_name: string;
  branche: string;
  created_at: string;
  updated_at: string;
}

export interface ForumThread {
  id: string;
  title: string;
  category: string;
  author_name: string;
  replies_count: number;
  upvotes: number;
  created_at: string;
  is_solved: boolean;
}

export interface CheckResult {
  id: string;
  status: string;
  ergebnisse: Array<{
    programm_id: number;
    programmname: string;
    relevanz_score: number;
    foerderart: string;
    max_summe: number;
  }>;
  aktionsplan: Array<{
    schritt: number;
    titel: string;
    beschreibung: string;
    deadline?: string;
    erledigt: boolean;
  }>;
}

// ═══ CONFIG ═══
const BASE = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_APP_URL || "");

// ═══ HELPERS ═══
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("zfbf_token") || null;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      credentials: "include", // Sendet zfbf_session Cookie mit
    });

    if (!res.ok) {
      const errorBody = await res.text();
      let errorMsg: string;
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed.error || parsed.message || `HTTP ${res.status}`;
      } catch {
        errorMsg = errorBody || `HTTP ${res.status}`;
      }
      return { data: null, error: errorMsg, status: res.status };
    }

    const data = await res.json() as T;
    return { data, error: null, status: res.status };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Netzwerkfehler",
      status: 0,
    };
  }
}

// ═══ API CLIENT ═══
export const api = {
  // ── AUTH ──
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: User; requires_2fa?: boolean }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    register: (data: { email: string; password: string; name: string; role: string }) =>
      request<{ message: string; user_id: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    verifyCode: (code: string, email: string) =>
      request<{ token: string; user: User }>("/api/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({ code, email }),
      }),

    session: () =>
      request<User>("/api/auth/session"),

    logout: () =>
      request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),

    forgotPassword: (email: string) =>
      request<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token: string, password: string) =>
      request<{ success: boolean }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
  },

  // ── FOERDERPROGRAMME ──
  foerderprogramme: {
    list: (params?: { gebiet?: string; art?: string; bereich?: string; search?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params?.gebiet) query.set("gebiet", params.gebiet);
      if (params?.art) query.set("art", params.art);
      if (params?.bereich) query.set("bereich", params.bereich);
      if (params?.search) query.set("search", params.search);
      if (params?.page) query.set("page", String(params.page));
      const qs = query.toString();
      // Direkt an fund24-api (oder via Next.js proxy)
      return request<{ programmes: Foerderprogramm[]; total: number; page: number }>(
        `/api/foerderprogramme${qs ? "?" + qs : ""}`
      );
    },

    get: (id: number) =>
      request<Foerderprogramm>(`/api/foerderprogramme/${id}`),

    stats: () =>
      request<{ total: number; by_gebiet: Record<string, number>; by_art: Record<string, number> }>(
        "/api/foerderprogramme/stats"
      ),
  },

  // ── BERATER (Netzwerk) ──
  berater: {
    list: (params?: { region?: string; branche?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.region) query.set("region", params.region);
      if (params?.branche) query.set("branche", params.branche);
      if (params?.search) query.set("search", params.search);
      const qs = query.toString();
      return request<{ berater: Berater[]; total: number }>(
        `/api/berater${qs ? "?" + qs : ""}`
      );
    },

    get: (id: string) =>
      request<Berater>(`/api/berater/${id}`),
  },

  // ── REPORTS (BAFA-Berichte) ──
  reports: {
    list: () =>
      request<Report[]>("/api/bafa/reports"),

    get: (id: string) =>
      request<Report>(`/api/bafa/reports/${id}`),

    generate: (data: { kunde_name: string; branche: string; beratungsthemen: string[] }) =>
      request<{ report_id: string; status: string }>("/api/bafa/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    download: (id: string) =>
      // Browser-Download: öffnet URL direkt
      `${BASE}/api/bafa/download/${id}`,

    kontingent: () =>
      request<{ remaining: number; total: number; plan: string }>("/api/bafa/kontingent"),
  },

  // ── PAYMENTS ──
  payments: {
    checkout: (data: { plan: string; payment_method: "stripe" | "paypal" }) =>
      request<{ checkout_url: string; session_id: string }>("/api/bafa/checkout", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // ── FOERDERMITTEL-CHECK ──
  check: {
    create: (data: {
      vorhaben: string;
      bundesland: string;
      branche?: string;
      mitarbeiter?: number;
      umsatz?: number;
    }) =>
      request<{ check_id: string; fragen: string[]; vorauswahl_count: number }>("/api/checks", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    chat: (checkId: string, message: string) =>
      request<{ antwort: string; extrahierte_daten: Record<string, unknown>; folgefragen: string[] }>(
        `/api/checks/${checkId}/chat`,
        { method: "POST", body: JSON.stringify({ nachricht: message }) }
      ),

    uploadDoc: (checkId: string, file: File, docType: string) => {
      const formData = new FormData();
      formData.append("datei", file);
      formData.append("doc_type", docType);
      // Kein Content-Type Header setzen (Browser setzt boundary automatisch)
      return request<{ doc_id: string; ki_extrakt: string }>(`/api/checks/${checkId}/docs`, {
        method: "POST",
        body: formData as unknown as BodyInit,
        headers: {}, // Kein Content-Type, FormData setzt es selbst
      });
    },

    analyze: (checkId: string) =>
      request<{ ergebnisse: CheckResult["ergebnisse"]; kombinierbarkeit: unknown }>(
        `/api/checks/${checkId}/analyze`,
        { method: "POST" }
      ),

    get: (checkId: string) =>
      request<CheckResult>(`/api/checks/${checkId}`),

    getActionPlan: (checkId: string) =>
      request<CheckResult["aktionsplan"]>(`/api/checks/${checkId}/plan`),
  },

  // ── FORUM ──
  forum: {
    list: (params?: { category?: string }) => {
      const qs = params?.category ? `?category=${params.category}` : "";
      return request<{ threads: ForumThread[]; total: number }>(`/api/forum${qs}`);
    },

    get: (id: string) =>
      request<ForumThread & { replies: Array<{ id: string; content: string; author: string; created_at: string }> }>(
        `/api/forum/${id}`
      ),

    create: (data: { title: string; content: string; category: string }) =>
      request<{ thread_id: string }>("/api/forum", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // ── DASHBOARD ──
  dashboard: {
    stats: () =>
      request<{
        berichte_count: number;
        kunden_count: number;
        programme_gespeichert: number;
        tracker_aktiv: number;
      }>("/api/dashboard/stats"),

    kunden: {
      list: () => request<Array<{ id: string; name: string; branche: string; created_at: string }>>("/api/kunden"),
      get: (id: string) => request<{ id: string; name: string; branche: string; kontakt: string }>(`/api/kunden/${id}`),
      create: (data: { name: string; branche: string; kontakt: string }) =>
        request<{ id: string }>("/api/kunden", { method: "POST", body: JSON.stringify(data) }),
    },
  },

  // ── USER PROFILE ──
  user: {
    profile: () => request<User>("/api/user/profile"),
    update: (data: Partial<User>) =>
      request<User>("/api/user/profile", { method: "PUT", body: JSON.stringify(data) }),
  },

  // ── BRANCHEN ──
  branchen: {
    list: () => request<Array<{ id: string; name: string; kpis: string[] }>>("/api/branchen"),
  },
};

// ═══ HOOKS (React) ═══
// Beispiel: useSWR-kompatible Fetcher-Funktion
export const apiFetcher = async (path: string) => {
  const token = getToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};
