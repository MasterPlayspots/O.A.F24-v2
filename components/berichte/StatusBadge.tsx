'use client';

// StatusBadge — Bericht-Status (draft/preview/paid/downloaded)
// Institutional Architect: tonal layering, no 1px borders, subtle roundedness.

export type BerichtStatus = 'draft' | 'preview' | 'paid' | 'downloaded';

const STYLES: Record<BerichtStatus, { bg: string; fg: string; label: string }> = {
  draft:      { bg: 'bg-architect-surface/40',           fg: 'text-white',           label: 'Entwurf' },
  preview:    { bg: 'bg-architect-primary/30',           fg: 'text-architect-primary-light',       label: 'Vorschau' },
  paid:       { bg: 'bg-architect-tertiary/25',           fg: 'text-architect-tertiary-light',       label: 'Bezahlt' },
  downloaded: { bg: 'bg-architect-tertiary/40',           fg: 'text-white',           label: 'Heruntergeladen' },
};

export function StatusBadge({ status }: { status: BerichtStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium tracking-wide font-body ${s.bg} ${s.fg}`}
    >
      {s.label}
    </span>
  );
}
