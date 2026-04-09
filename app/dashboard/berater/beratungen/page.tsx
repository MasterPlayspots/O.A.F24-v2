'use client';

// /dashboard/berater/beratungen — Berater Beratungs-Index
// Sprint 19: lists active and past consultations from /api/beratungen
// (worker GET handler from Sprint 17, ownership-corrected in Sprint 18).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import { listBeratungen, type Beratung, type BeratungPhase } from '@/lib/api/fund24';
import { ArrowRight, Briefcase, Plus } from 'lucide-react';

const PHASE_LABEL: Record<BeratungPhase, string> = {
  anlauf: 'Anlauf',
  datenerhebung: 'Datenerhebung',
  durchfuehrung: 'Durchführung',
  bericht: 'Bericht',
  eingereicht: 'Eingereicht',
  bewilligt: 'Bewilligt',
  abgeschlossen: 'Abgeschlossen',
  abgelehnt: 'Abgelehnt',
};

const PHASE_STYLE: Record<BeratungPhase, { bg: string; fg: string }> = {
  anlauf:        { bg: 'bg-architect-surface/40',   fg: 'text-white' },
  datenerhebung: { bg: 'bg-architect-primary/20',   fg: 'text-architect-primary-light' },
  durchfuehrung: { bg: 'bg-architect-primary/30',   fg: 'text-architect-primary-light' },
  bericht:       { bg: 'bg-architect-primary/40',   fg: 'text-architect-primary-light' },
  eingereicht:   { bg: 'bg-architect-primary/50',   fg: 'text-architect-primary-light' },
  bewilligt:     { bg: 'bg-architect-tertiary/35',  fg: 'text-architect-tertiary-light' },
  abgeschlossen: { bg: 'bg-architect-tertiary/50',  fg: 'text-architect-tertiary-light' },
  abgelehnt:     { bg: 'bg-architect-error/25',     fg: 'text-architect-error-container' },
};

function fmtEUR(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function BeratungenIndexPage() {
  const router = useRouter();
  const { token, nutzer, istBerater } = useAuth();
  const [beratungen, setBeratungen] = useState<Beratung[]>([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (nutzer && !istBerater()) { router.replace('/dashboard/unternehmen'); }
  }, [token, nutzer, istBerater, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listBeratungen();
        if (!cancelled) setBeratungen(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setFehler(e instanceof Error ? e.message : 'Beratungen konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between gap-8 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-3">
              BAFA · Berater
            </p>
            <h1 className="font-display font-bold text-5xl tracking-[-0.02em] leading-none">
              Meine Beratungen
            </h1>
            <p className="mt-3 text-white/60">
              Übersicht aller Beratungs-Vorgänge die du betreust.
            </p>
          </div>
          <Link
            href="/dashboard/berater/anfragen"
            className="px-5 py-2.5 rounded-md font-display font-semibold text-sm text-white tracking-wide
                       bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110
                       shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition shrink-0"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Neue Anfragen
          </Link>
        </div>

        {fehler && (
          <div className="mb-8 px-5 py-4 rounded-md bg-architect-error/15 text-architect-error-container text-sm">
            {fehler}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-architect-surface-low/40 rounded-lg h-24 animate-pulse" />
            ))}
          </div>
        ) : beratungen.length === 0 ? (
          <div className="bg-architect-surface/60 rounded-lg p-12 text-center shadow-[0_10px_40px_rgba(101,117,173,0.06)]">
            <Briefcase className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-white mb-2">Noch keine Beratungen</h2>
            <p className="text-sm text-white/60 mb-6">
              Sobald du eine Anfrage annimmst, wird hier eine Beratung angelegt.
            </p>
            <Link
              href="/dashboard/berater/anfragen"
              className="inline-block px-6 py-3 rounded-md font-display font-semibold text-white tracking-wide
                         bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110 transition"
            >
              Zu den Anfragen
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {beratungen.map((b) => {
              const phase = (b.phase ?? 'anlauf') as BeratungPhase;
              const ps = PHASE_STYLE[phase] ?? PHASE_STYLE.anlauf;
              return (
                <Link
                  key={b.id}
                  href={`/dashboard/berater/beratungen/${b.id}`}
                  className="block bg-architect-surface/60 hover:bg-architect-surface/80 rounded-lg p-6 transition
                             shadow-[0_10px_40px_rgba(101,117,173,0.06)]"
                >
                  <div className="flex items-center justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-md text-xs font-medium ${ps.bg} ${ps.fg}`}>
                          {PHASE_LABEL[phase] ?? phase}
                        </span>
                        {b.bafa_antrag_nr && (
                          <span className="text-xs text-white/60">
                            BAFA-Nr: <span className="font-mono text-white/80">{b.bafa_antrag_nr}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-semibold text-white truncate">
                        {b.unternehmen_name ?? 'Unbenanntes Unternehmen'}
                      </h3>
                      <p className="font-mono text-xs text-white/40 truncate mt-1">{b.id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-white/50 uppercase tracking-wide">Förderhöhe</p>
                      <p className="font-display text-lg font-bold text-architect-tertiary-light">
                        {fmtEUR(b.foerderhoehe)}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        {new Date(b.updated_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/40 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
