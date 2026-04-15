'use client';

// NeuerAntragModal — Architect Dark Modal für Antrag-Erstellung.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { programm_id: string; beschreibung?: string }) => Promise<void>;
}

export function NeuerAntragModal({ open, onClose, onSubmit }: Props) {
  const [programmId, setProgrammId] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fehler, setFehler] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programmId.trim()) {
      setFehler('Programm-ID erforderlich.');
      return;
    }
    setFehler('');
    setSubmitting(true);
    try {
      await onSubmit({
        programm_id: programmId.trim(),
        beschreibung: beschreibung.trim() || undefined,
      });
      setProgrammId('');
      setBeschreibung('');
      onClose();
    } catch (e2) {
      setFehler(e2 instanceof Error ? e2.message : 'Antrag konnte nicht gestellt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl p-8 bg-architect-surface-low/95 backdrop-blur-md text-white shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
      >
        <h2 className="font-display text-2xl font-bold text-white mb-2 tracking-tight">
          Neuen Antrag stellen
        </h2>
        <p className="text-sm text-white/70 mb-6">
          Wähle ein Förderprogramm und beschreibe kurz dein Vorhaben.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">
              Programm-ID
            </label>
            <Input
              value={programmId}
              onChange={(e) => setProgrammId(e.target.value)}
              placeholder="z. B. p_a1b2c3…"
              autoFocus
              className="bg-architect-surface/60 border-0 text-white placeholder:text-white/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">
              Beschreibung (optional)
            </label>
            <textarea
              rows={4}
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Kurze Beschreibung des Vorhabens…"
              className="w-full rounded-md bg-architect-surface/60 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-architect-primary-light"
            />
          </div>

          {fehler && (
            <div className="px-4 py-3 rounded-md bg-architect-error/20 text-architect-error-container text-sm">
              {fehler}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="text-white/70 hover:text-white hover:bg-architect-surface/40"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-architect-primary hover:bg-architect-primary-container text-white"
            >
              {submitting ? 'Wird gestellt …' : 'Antrag stellen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
