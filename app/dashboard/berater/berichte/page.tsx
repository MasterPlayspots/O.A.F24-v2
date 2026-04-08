'use client';

// /dashboard/berater/berichte — Übersicht aller γ-Hybrid Berichte des Beraters.
// Stil: "The Institutional Architect" (dark, tonal layering, no 1px borders).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import { listBerichte, type Bericht } from '@/lib/api/fund24';
import { StatusBadge, type BerichtStatus } from '@/components/berichte/StatusBadge';

export default function BerichteUebersichtPage() {
  const router = useRouter();
  const { token, nutzer, istBerater } = useAuth();
  const [berichte, setBerichte] = useState<Bericht[]>([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (nutzer && !istBerater()) { router.replace('/dashboard/unternehmen'); return; }
  }, [token, nutzer, istBerater, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listBerichte();
        if (!cancelled) setBerichte(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setFehler(e instanceof Error ? e.message : 'Berichte konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#737688] font-[family-name:var(--font-inter)] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between gap-8 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-3">
              γ-Hybrid · Übersicht
            </p>
            <h1 className="font-[family-name:var(--font-manrope)] font-bold text-5xl tracking-[-0.02em] leading-none">
              Meine Berichte
            </h1>
          </div>
          <Link
            href="/dashboard/berater/berichte/new"
            className="px-6 py-3 rounded-md font-[family-name:var(--font-manrope)] font-semibold text-white tracking-wide
                       bg-gradient-to-br from-[#6575ad] to-[#4a5a8f] hover:brightness-110
                       shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition"
          >
            Neuer Bericht
          </Link>
        </div>

        {fehler && (
          <div className="mb-8 px-5 py-4 rounded-md bg-[#ba1a1a]/15 text-[#ffdad6] text-sm">
            {fehler}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#637c74]/40 rounded-lg h-20 animate-pulse" />
            ))}
          </div>
        ) : berichte.length === 0 ? (
          <div className="bg-[#737688]/60 rounded-lg p-12 text-center shadow-[0_10px_40px_rgba(101,117,173,0.06)]">
            <p className="font-[family-name:var(--font-manrope)] text-2xl text-white/80 mb-3">
              Noch keine Berichte
            </p>
            <p className="text-sm text-white/50 mb-8">
              Lege deinen ersten γ-Hybrid Bericht an.
            </p>
            <Link
              href="/dashboard/berater/berichte/new"
              className="inline-block px-6 py-3 rounded-md font-[family-name:var(--font-manrope)] font-semibold
                         bg-gradient-to-br from-[#6575ad] to-[#4a5a8f] hover:brightness-110 transition"
            >
              Bericht erstellen
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {berichte.map((b) => (
              <Link
                key={b.id}
                href={`/dashboard/berater/berichte/${b.id}`}
                className="block bg-[#737688]/60 hover:bg-[#737688]/80 rounded-lg p-6 transition
                           shadow-[0_10px_40px_rgba(101,117,173,0.06)]"
              >
                <div className="flex items-center justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusBadge status={b.status as BerichtStatus} />
                      {b.quality_score != null && (
                        <span className="text-xs text-white/60">
                          Quality: <span className="text-[#7fe8c8] font-semibold">{b.quality_score}</span>
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-white/50 truncate">{b.id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-white/50">Aktualisiert</p>
                    <p className="text-sm text-white/80">
                      {b.updated_at ? new Date(b.updated_at).toLocaleDateString('de-DE') : '—'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
