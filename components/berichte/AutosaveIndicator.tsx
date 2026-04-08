'use client';

// AutosaveIndicator — zeigt Speicherzustand neben dem Editor.

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const MAP: Record<SaveState, { dot: string; text: string; label: string }> = {
  idle:   { dot: 'bg-white/30',           text: 'text-white/60',          label: 'Bereit' },
  saving: { dot: 'bg-architect-primary animate-pulse', text: 'text-architect-primary-light',    label: 'Wird gespeichert…' },
  saved:  { dot: 'bg-architect-tertiary',          text: 'text-architect-tertiary-light',         label: 'Gespeichert' },
  error:  { dot: 'bg-architect-error',          text: 'text-architect-error-container',         label: 'Fehler beim Speichern' },
};

export function AutosaveIndicator({ state }: { state: SaveState }) {
  const m = MAP[state];
  return (
    <div className="inline-flex items-center gap-2 font-body text-xs">
      <span className={`w-2 h-2 rounded-full ${m.dot}`} />
      <span className={m.text}>{m.label}</span>
    </div>
  );
}
