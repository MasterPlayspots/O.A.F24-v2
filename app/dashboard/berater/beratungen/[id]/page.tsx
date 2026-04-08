'use client';

// /dashboard/berater/beratungen/[id] — Beratungs-Protokoll-Editor.
// Stil: "The Institutional Architect" (dark, tonal layering).

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import { getBeratung, updateBeratung, type Beratung, type BeratungPhase } from '@/lib/api/fund24';
import { AutosaveIndicator, type SaveState } from '@/components/berichte/AutosaveIndicator';

const PHASEN: { value: BeratungPhase; label: string }[] = [
  { value: 'anlauf',         label: 'Anlauf' },
  { value: 'beratung',       label: 'Beratung' },
  { value: 'nachbereitung',  label: 'Nachbereitung' },
  { value: 'abgeschlossen',  label: 'Abgeschlossen' },
];

const PHASE_STYLE: Record<BeratungPhase, { bg: string; fg: string }> = {
  anlauf:        { bg: 'bg-architect-surface/40', fg: 'text-white' },
  beratung:      { bg: 'bg-architect-primary/30', fg: 'text-architect-primary-light' },
  nachbereitung: { bg: 'bg-architect-primary/40', fg: 'text-architect-primary-light' },
  abgeschlossen: { bg: 'bg-architect-tertiary/35', fg: 'text-architect-tertiary-light' },
};

function fmtEUR(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function BeratungEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, nutzer, istBerater } = useAuth();
  const id = params?.id ?? '';

  const [beratung, setBeratung] = useState<Beratung | null>(null);
  const [protokoll, setProtokoll] = useState('');
  const [foerderhoehe, setFoerderhoehe] = useState<string>('');
  const [eigenanteil, setEigenanteil] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const lastProtokoll = useRef('');
  const lastFoerder = useRef('');
  const lastEigen = useRef('');

  // Guard
  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (nutzer && !istBerater()) { router.replace('/dashboard/unternehmen'); }
  }, [token, nutzer, istBerater, router]);

  // Load
  useEffect(() => {
    if (!id || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const b = await getBeratung(id);
        if (cancelled) return;
        setBeratung(b);
        setProtokoll(b.protokoll ?? '');
        setFoerderhoehe(b.foerderhoehe != null ? String(b.foerderhoehe) : '');
        setEigenanteil(b.eigenanteil != null ? String(b.eigenanteil) : '');
        lastProtokoll.current = b.protokoll ?? '';
        lastFoerder.current = b.foerderhoehe != null ? String(b.foerderhoehe) : '';
        lastEigen.current = b.eigenanteil != null ? String(b.eigenanteil) : '';
      } catch (e) {
        if (!cancelled) setFehler(e instanceof Error ? e.message : 'Beratung konnte nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, token]);

  const save = useCallback(
    async (patch: Parameters<typeof updateBeratung>[1]) => {
      if (!beratung) return;
      setSaveState('saving');
      try {
        await updateBeratung(beratung.id, patch);
        setSaveState('saved');
      } catch (e) {
        setSaveState('error');
        setFehler(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
      }
    },
    [beratung]
  );

  const handlePhaseChange = async (phase: BeratungPhase) => {
    if (!beratung || phase === beratung.phase) return;
    setBeratung({ ...beratung, phase });
    await save({ phase });
  };

  const handleProtokollBlur = async () => {
    if (protokoll === lastProtokoll.current) return;
    lastProtokoll.current = protokoll;
    await save({ protokoll });
  };

  const handleFoerderBlur = async () => {
    if (foerderhoehe === lastFoerder.current) return;
    lastFoerder.current = foerderhoehe;
    const n = foerderhoehe === '' ? undefined : Number(foerderhoehe);
    if (n !== undefined && Number.isNaN(n)) {
      setFehler('Förderhöhe muss eine Zahl sein.');
      setSaveState('error');
      return;
    }
    await save({ foerderhoehe: n });
  };

  const handleEigenBlur = async () => {
    if (eigenanteil === lastEigen.current) return;
    lastEigen.current = eigenanteil;
    const n = eigenanteil === '' ? undefined : Number(eigenanteil);
    if (n !== undefined && Number.isNaN(n)) {
      setFehler('Eigenanteil muss eine Zahl sein.');
      setSaveState('error');
      return;
    }
    await save({ eigenanteil: n });
  };

  const phase = beratung?.phase ?? 'anlauf';
  const ps = PHASE_STYLE[phase];

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-8 mb-12">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-3">BAFA-Beratung</p>
            <h1 className="font-display font-bold text-5xl tracking-[-0.02em] leading-none truncate">
              {beratung?.unternehmen_name ?? 'Beratung'}
            </h1>
            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <span className={`px-3 py-1 rounded-md text-xs font-medium ${ps.bg} ${ps.fg}`}>
                {PHASEN.find((p) => p.value === phase)?.label}
              </span>
              {beratung?.bafa_antrag_nr && (
                <span className="text-xs text-white/60">
                  BAFA-Nr: <span className="font-mono text-white/80">{beratung.bafa_antrag_nr}</span>
                </span>
              )}
              {beratung?.branche && (
                <span className="text-xs text-white/60">
                  Branche: <span className="text-white/80">{beratung.branche}</span>
                </span>
              )}
              <AutosaveIndicator state={saveState} />
            </div>
          </div>
        </div>

        {fehler && (
          <div className="mb-8 px-5 py-4 rounded-md bg-architect-error/15 text-architect-error-container text-sm">{fehler}</div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="bg-architect-surface-low/40 rounded-lg h-32 animate-pulse" />
            <div className="bg-architect-surface-low/40 rounded-lg h-64 animate-pulse" />
          </div>
        ) : beratung ? (
          <div className="bg-architect-surface/60 rounded-lg p-10 space-y-10 shadow-[0_10px_40px_rgba(101,117,173,0.06)]">
            {/* Phase */}
            <div>
              <label className="block font-display text-sm font-semibold tracking-wide text-white mb-3">
                Phase
              </label>
              <select
                value={phase}
                onChange={(e) => handlePhaseChange(e.target.value as BeratungPhase)}
                className="w-full md:w-80 bg-architect-surface-low/60 focus:bg-architect-surface/80 rounded-md px-4 py-3
                           font-body text-sm text-white
                           outline-none transition-colors focus:ring-1 focus:ring-architect-primary/40"
              >
                {PHASEN.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Förderhöhe + Eigenanteil */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-display text-sm font-semibold tracking-wide text-white mb-3">
                  Förderhöhe (€)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={foerderhoehe}
                  onChange={(e) => setFoerderhoehe(e.target.value)}
                  onBlur={handleFoerderBlur}
                  placeholder="0"
                  className="w-full bg-architect-surface-low/60 focus:bg-architect-surface/80 rounded-md px-4 py-3
                             font-body text-sm text-white placeholder-white/30
                             outline-none transition-colors focus:ring-1 focus:ring-architect-primary/40"
                />
                <p className="mt-2 text-xs text-white/40">
                  Aktuell: <span className="text-white/70">{fmtEUR(beratung.foerderhoehe)}</span>
                </p>
              </div>
              <div>
                <label className="block font-display text-sm font-semibold tracking-wide text-white mb-3">
                  Eigenanteil (€)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={eigenanteil}
                  onChange={(e) => setEigenanteil(e.target.value)}
                  onBlur={handleEigenBlur}
                  placeholder="0"
                  className="w-full bg-architect-surface-low/60 focus:bg-architect-surface/80 rounded-md px-4 py-3
                             font-body text-sm text-white placeholder-white/30
                             outline-none transition-colors focus:ring-1 focus:ring-architect-primary/40"
                />
                <p className="mt-2 text-xs text-white/40">
                  Aktuell: <span className="text-white/70">{fmtEUR(beratung.eigenanteil)}</span>
                </p>
              </div>
            </div>

            {/* Protokoll */}
            <div>
              <label className="block font-display text-sm font-semibold tracking-wide text-white mb-3">
                Protokoll
              </label>
              <textarea
                rows={14}
                value={protokoll}
                onChange={(e) => setProtokoll(e.target.value)}
                onBlur={handleProtokollBlur}
                placeholder="Protokoll der Beratung…"
                className="w-full bg-architect-surface-low/60 focus:bg-architect-surface/80 rounded-md px-4 py-3
                           font-body text-[15px] text-white placeholder-white/30
                           outline-none transition-colors resize-y focus:ring-1 focus:ring-architect-primary/30"
              />
            </div>
          </div>
        ) : null}

        {beratung && (
          <div className="mt-8 text-xs text-white/40">
            <div>ID: <span className="font-mono text-white/60">{beratung.id}</span></div>
            <div>
              Erstellt: {new Date(beratung.created_at).toLocaleDateString('de-DE')} · Aktualisiert:{' '}
              {new Date(beratung.updated_at).toLocaleDateString('de-DE')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
