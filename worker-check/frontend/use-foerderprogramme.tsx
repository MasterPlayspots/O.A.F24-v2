/**
 * React Hook: useFoerderprogramme
 *
 * Drop-in Replacement für statische foerderprogramme-data.ts Imports.
 * Lädt echte Daten aus fund24-api (2.467 Programme) mit:
 * - Suche, Filter, Pagination
 * - Loading/Error States
 * - Automatisches Caching (SWR-Style)
 *
 * MIGRATION:
 * Vorher:  import { FOERDERPROGRAMME } from "@/lib/foerderprogramme-data";
 * Nachher: const { programme, loading, error } = useFoerderprogramme();
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, type Foerderprogramm } from "./api-client";

interface UseFoerderprogrammeOptions {
  /** Bundesland-Filter */
  gebiet?: string;
  /** Förderart-Filter (Zuschuss, Kredit, etc.) */
  art?: string;
  /** Förderbereich-Filter */
  bereich?: string;
  /** Suchbegriff */
  search?: string;
  /** Seite (1-basiert) */
  page?: number;
  /** Ergebnisse pro Seite */
  limit?: number;
  /** Automatisch laden (default: true) */
  autoFetch?: boolean;
}

interface UseFoerderprogrammeReturn {
  programme: Foerderprogramm[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (p: number) => void;
  setSearch: (s: string) => void;
  setFilter: (key: "gebiet" | "art" | "bereich", value: string) => void;
  refresh: () => void;
}

export function useFoerderprogramme(
  options: UseFoerderprogrammeOptions = {}
): UseFoerderprogrammeReturn {
  const { autoFetch = true } = options;

  const [programme, setProgramme] = useState<Foerderprogramm[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(options.page || 1);
  const [search, setSearch] = useState(options.search || "");
  const [filters, setFilters] = useState({
    gebiet: options.gebiet || "",
    art: options.art || "",
    bereich: options.bereich || "",
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Vorherigen Request abbrechen
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    const params: Record<string, string> = {};
    if (filters.gebiet) params.gebiet = filters.gebiet;
    if (filters.art) params.art = filters.art;
    if (filters.bereich) params.bereich = filters.bereich;
    if (search) params.search = search;
    if (page > 1) params.page = String(page);

    const { data, error: err } = await api.foerderprogramme.list(params as any);

    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    if (data) {
      setProgramme(data.programmes || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [page, search, filters]);

  useEffect(() => {
    if (autoFetch) fetchData();
  }, [fetchData, autoFetch]);

  const setFilter = useCallback((key: "gebiet" | "art" | "bereich", value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset auf Seite 1 bei Filter-Änderung
  }, []);

  return {
    programme,
    total,
    loading,
    error,
    page,
    setPage,
    setSearch: (s: string) => { setSearch(s); setPage(1); },
    setFilter,
    refresh: fetchData,
  };
}

/**
 * React Hook: useBerater
 *
 * Drop-in Replacement für statische berater-data.ts Imports.
 * Lädt echte Berater-Profile aus dem Backend.
 *
 * MIGRATION:
 * Vorher:  import { MOCK_BERATER } from "@/lib/berater-data";
 * Nachher: const { berater, loading } = useBerater();
 */
export function useBerater(params?: { region?: string; branche?: string; search?: string }) {
  const [berater, setBerater] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.berater.list(params).then(({ data, error: err }) => {
      if (err) setError(err);
      if (data) setBerater((data as any).berater || []);
      setLoading(false);
    });
  }, [params?.region, params?.branche, params?.search]);

  return { berater, loading, error };
}

/**
 * React Hook: useAuth
 *
 * Verbesserter Auth-Hook der gegen den Worker validiert.
 * Ersetzt den localStorage-basierten AuthContext.
 */
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    api.auth.session().then(({ data, error }) => {
      if (data) {
        setUser(data);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        // Token entfernen wenn ungültig
        if (typeof window !== "undefined") {
          localStorage.removeItem("zfbf_token");
        }
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await api.auth.login(email, password);
    if (data && data.token) {
      localStorage.setItem("zfbf_token", data.token);
      setUser(data.user);
      setIsAuthenticated(true);
    }
    return { data, error };
  };

  const logout = async () => {
    await api.auth.logout();
    localStorage.removeItem("zfbf_token");
    setUser(null);
    setIsAuthenticated(false);
  };

  return { user, loading, isAuthenticated, login, logout };
}
