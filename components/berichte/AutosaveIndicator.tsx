'use client';

// AutosaveIndicator — zeigt Speicherzustand neben dem Editor.

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const MAP: Record<SaveState, { dot: string; text: string; label: string }> = {
  idle:   { dot: 'bg-white/30',           text: 'text-white/60',          label: 'Bereit' },
  saving: { dot: 'bg-[#6575ad] animate-pulse', text: 'text-[#c9d1ff]',    label: 'Wird gespeichert…' },
  saved:  { dot: 'bg-[#069e7c]',          text: 'text-[#7fe8c8]',         label: 'Gespeichert' },
  error:  { dot: 'bg-[#ba1a1a]',          text: 'text-[#ffdad6]',         label: 'Fehler beim Speichern' },
};

export function AutosaveIndicator({ state }: { state: SaveState }) {
  const m = MAP[state];
  return (
    <div className="inline-flex items-center gap-2 font-[family-name:var(--font-inter)] text-xs">
      <span className={`w-2 h-2 rounded-full ${m.dot}`} />
      <span className={m.text}>{m.label}</span>
    </div>
  );
}
