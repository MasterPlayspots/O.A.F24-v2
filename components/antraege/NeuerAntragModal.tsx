'use client';

// NeuerAntragModal — Light-Mode Modal für Antrag-Erstellung.

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
      setFehler(e2 instanceof Error ? e2.message : 'Antrag konnte nicht erstellt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl p-8 bg-white shadow-xl border border-slate-200"
      >
        <h2 className="text-xl font-bold text-slate-900 mb-2">Neuen Antrag stellen</h2>
        <p className="text-sm text-slate-600 mb-6">
          Wähle ein Förderprogramm und beschreibe kurz dein Vorhaben.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
              Programm-ID
            </label>
            <Input
              value={programmId}
              onChange={(e) => setProgrammId(e.target.value)}
              placeholder="z. B. p_a1b2c3…"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
              Beschreibung (optional)
            </label>
            <textarea
              rows={4}
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Kurze Beschreibung des Vorhabens…"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
            />
          </div>

          {fehler && (
            <div className="px-3 py-2 rounded-md bg-red-50 text-red-700 text-xs">{fehler}</div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Erstellt…' : 'Antrag erstellen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
