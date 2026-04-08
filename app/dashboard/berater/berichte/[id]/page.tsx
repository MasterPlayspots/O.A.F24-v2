'use client';

// /dashboard/berater/berichte/[id] — γ-Hybrid Bericht-Editor
// Stil: "The Institutional Architect" (dark, tonal layering, no 1px borders).

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import {
  getBericht,
  createBericht,
  updateBericht,
  finalizeBericht,
  type Bericht,
} from '@/lib/api/fund24';
import { StatusBadge, type BerichtStatus } from '@/components/berichte/StatusBadge';
import { AutosaveIndicator, type SaveState } from '@/components/berichte/AutosaveIndicator';
import { QualityScoreRing } from '@/components/berichte/QualityScoreRing';
import { FinalizeButton } from '@/components/berichte/FinalizeButton';

interface BerichtContent {
  ausgangslage?: string;
  ziele?: string;
  massnahmen?: string;
  wirtschaftlichkeit?: string;
  empfehlung?: string;
}

const FELDER: Array<{ key: keyof BerichtContent; label: string; rows: number }> = [
  { key: 'ausgangslage',       label: 'Ausgangslage',         rows: 5 },
  { key: 'ziele',              label: 'Ziele',                rows: 4 },
  { key: 'massnahmen',         label: 'Maßnahmen',            rows: 6 },
  { key: 'wirtschaftlichkeit', label: 'Wirtschaftlichkeit',   rows: 5 },
  { key: 'empfehlung',         label: 'Empfehlung',           rows: 4 },
];

export default function BerichtEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { nutzer, istBerater, token } = useAuth();
  const id = params?.id ?? '';
  const isNew = id === 'new';

  const [bericht, setBericht] = useState<Bericht | null>(null);
  const [content, setContent] = useState<BerichtContent>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [finalizing, setFinalizing] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [fehler, setFehler] = useState<string>('');
  const lastSaved = useRef<string>('');

  const bafaCertified = nutzer?.bafa_certified === 1;

  // Guard
  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (nutzer && !istBerater()) { router.replace('/dashboard/unternehmen'); }
  }, [token, nutzer, istBerater, router]);

  // Laden (außer bei "new")
  useEffect(() => {
    if (isNew || !token) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const b = await getBericht(id);
        if (cancelled) return;
        setBericht(b);
        setContent((b.content as BerichtContent) ?? {});
        lastSaved.current = JSON.stringify((b.content as BerichtContent) ?? {});
      } catch (e) {
        if (!cancelled) setFehler(e instanceof Error ? e.message : 'Bericht konnte nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isNew, token]);

  // Autosave on blur
  const handleBlur = useCallback(async () => {
    const snap = JSON.stringify(content);
    if (snap === lastSaved.current) return;

    setSaveState('saving');
    try {
      if (isNew && !bericht) {
        const created = await createBericht({ content });
        // Nach Create: in echte URL navigieren.
        router.replace(`/dashboard/berater/berichte/${(created as { id: string }).id}`);
      } else if (bericht) {
        await updateBericht(bericht.id, { content });
      }
      lastSaved.current = snap;
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      setFehler(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    }
  }, [content, bericht, isNew, router]);

  const handleFinalize = useCallback(async () => {
    if (!bericht) return;
    setFinalizing(true);
    try {
      await finalizeBericht(bericht.id);
      const fresh = await getBericht(bericht.id);
      setBericht(fresh);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Finalisieren fehlgeschlagen.');
    } finally {
      setFinalizing(false);
    }
  }, [bericht]);

  const status: BerichtStatus = (bericht?.status ?? 'draft') as BerichtStatus;
  const score = bericht?.quality_score ?? 0;

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-8 mb-12">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.2em] text-white/50 mb-3">
              γ-Hybrid · Berater-Bericht
            </p>
            <h1 className="font-display font-bold text-white text-5xl tracking-[-0.02em] leading-none">
              {isNew ? 'Neuer Bericht' : 'Bericht bearbeiten'}
            </h1>
            <div className="mt-5 flex items-center gap-4">
              <StatusBadge status={status} />
              <AutosaveIndicator state={saveState} />
            </div>
          </div>
          <div className="shrink-0">
            <QualityScoreRing score={score} />
          </div>
        </div>

        {/* Fehler */}
        {fehler && (
          <div className="mb-8 px-5 py-4 rounded-md bg-architect-error/15 text-architect-error-container font-body text-sm">
            {fehler}
          </div>
        )}

        {/* Editor-Card (surface_container_lowest auf surface) */}
        {loading ? (
          <div className="bg-architect-surface-low/40 rounded-lg h-96 animate-pulse" />
        ) : (
          <div className="bg-architect-surface/60 rounded-lg p-10 space-y-10 shadow-[0_10px_40px_rgba(101,117,173,0.06)]">
            {FELDER.map((feld) => (
              <div key={feld.key}>
                <label className="block font-display text-sm font-semibold tracking-wide text-white mb-3">
                  {feld.label}
                </label>
                <textarea
                  rows={feld.rows}
                  value={content[feld.key] ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, [feld.key]: e.target.value }))}
                  onBlur={handleBlur}
                  className="w-full bg-architect-surface-low/60 focus:bg-architect-surface/80 rounded-md px-4 py-3
                             font-body text-[15px] text-white placeholder-white/30
                             outline-none transition-colors resize-y
                             focus:ring-1 focus:ring-architect-primary/30"
                  placeholder={`${feld.label} beschreiben…`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {bericht && (
          <div className="mt-10 flex items-end justify-between gap-6">
            <div className="font-body text-xs text-white/50 space-y-1">
              <div>ID: <span className="text-white/70 font-mono">{bericht.id}</span></div>
              {bericht.finalized_by_berater_id && (
                <div>
                  Finalisiert von:{' '}
                  <span className="text-architect-tertiary-light font-mono">{bericht.finalized_by_berater_id}</span>
                </div>
              )}
              <div>Status-Flow: draft → preview → paid → downloaded</div>
            </div>
            <FinalizeButton
              status={status}
              bafaCertified={bafaCertified}
              loading={finalizing}
              onFinalize={handleFinalize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
