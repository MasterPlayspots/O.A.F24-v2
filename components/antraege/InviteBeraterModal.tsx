'use client';

// InviteBeraterModal — Glassmorphism: surface @80% + 20px backdrop-blur.

import { useState } from 'react';

type Rolle = 'editor' | 'viewer' | 'reviewer';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { berater_id: string; rolle: Rolle }) => Promise<void>;
}

export function InviteBeraterModal({ open, onClose, onSubmit }: Props) {
  const [beraterId, setBeraterId] = useState('');
  const [rolle, setRolle] = useState<Rolle>('editor');
  const [submitting, setSubmitting] = useState(false);
  const [fehler, setFehler] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beraterId.trim()) {
      setFehler('Berater-ID erforderlich.');
      return;
    }
    setFehler('');
    setSubmitting(true);
    try {
      await onSubmit({ berater_id: beraterId.trim(), rolle });
      setBeraterId('');
      setRolle('editor');
      onClose();
    } catch (e2) {
      setFehler(e2 instanceof Error ? e2.message : 'Einladung fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl p-8 bg-architect-surface/80 backdrop-blur-[20px]
                   shadow-[0_10px_60px_rgba(101,117,173,0.25)]"
      >
        <h2 className="font-display font-bold text-2xl text-white tracking-tight mb-2">
          Berater einladen
        </h2>
        <p className="font-body text-sm text-white/60 mb-6">
          Erteile einem Berater Zugriff auf diesen Antrag.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-display text-xs font-semibold tracking-wide text-white/80 mb-2 uppercase">
              Berater-ID
            </label>
            <input
              type="text"
              value={beraterId}
              onChange={(e) => setBeraterId(e.target.value)}
              placeholder="z. B. b_a1b2c3…"
              className="w-full bg-architect-surface-low/60 focus:bg-architect-surface/80 rounded-md px-4 py-3
                         font-body text-sm text-white placeholder-white/30
                         outline-none transition-colors focus:ring-1 focus:ring-architect-primary/40"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-display text-xs font-semibold tracking-wide text-white/80 mb-2 uppercase">
              Rolle
            </label>
            <select
              value={rolle}
              onChange={(e) => setRolle(e.target.value as Rolle)}
              className="w-full bg-architect-surface-low/60 focus:bg-architect-surface/80 rounded-md px-4 py-3
                         font-body text-sm text-white
                         outline-none transition-colors focus:ring-1 focus:ring-architect-primary/40"
            >
              <option value="editor">Editor — kann bearbeiten</option>
              <option value="viewer">Viewer — nur lesen</option>
              <option value="reviewer">Reviewer — kann kommentieren</option>
            </select>
          </div>

          {fehler && (
            <div className="px-4 py-3 rounded-md bg-architect-error/15 text-architect-error-container font-body text-xs">
              {fehler}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-md font-body text-sm text-white/70 hover:text-white transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-md font-display font-semibold text-sm text-white tracking-wide
                         bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110
                         shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition disabled:opacity-50"
            >
              {submitting ? 'Lädt…' : 'Einladen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
