'use client';

// NeueVorlageModal — Light-Mode Modal für neue Template-Library Einträge.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { titel: string; kategorie?: string; inhalt: string }) => Promise<void>;
}

export function NeueVorlageModal({ open, onClose, onSubmit }: Props) {
  const [titel, setTitel] = useState('');
  const [kategorie, setKategorie] = useState('');
  const [inhalt, setInhalt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fehler, setFehler] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titel.trim() || !inhalt.trim()) {
      setFehler('Titel und Inhalt sind erforderlich.');
      return;
    }
    setFehler('');
    setSubmitting(true);
    try {
      await onSubmit({
        titel: titel.trim(),
        kategorie: kategorie.trim() || undefined,
        inhalt: inhalt.trim(),
      });
      setTitel('');
      setKategorie('');
      setInhalt('');
      onClose();
    } catch (e2) {
      setFehler(e2 instanceof Error ? e2.message : 'Vorlage konnte nicht erstellt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl p-8 bg-white shadow-xl border border-border"
      >
        <h2 className="text-xl font-bold text-foreground mb-2">Neue Vorlage</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Speichere wiederverwendbare Textbausteine für deine Berichte.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
              Titel
            </label>
            <Input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="z. B. Standard-Empfehlung Digitalisierung"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
              Kategorie (optional)
            </label>
            <Input
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value)}
              placeholder="z. B. Digitalisierung, Energie, Marketing"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">
              Inhalt
            </label>
            <textarea
              rows={10}
              value={inhalt}
              onChange={(e) => setInhalt(e.target.value)}
              placeholder="Den eigentlichen Textbaustein hier einfügen…"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 resize-y"
            />
          </div>

          {fehler && (
            <div className="px-3 py-2 rounded-md bg-destructive/10 text-destructive text-xs">{fehler}</div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Erstellt…' : 'Vorlage speichern'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
