'use client';

// StatusBadge — Bericht-Status (draft/preview/paid/downloaded)
// Institutional Architect: tonal layering, no 1px borders, subtle roundedness.

export type BerichtStatus = 'draft' | 'preview' | 'paid' | 'downloaded';

const STYLES: Record<BerichtStatus, { bg: string; fg: string; label: string }> = {
  draft:      { bg: 'bg-[#737688]/40',           fg: 'text-white',           label: 'Entwurf' },
  preview:    { bg: 'bg-[#6575ad]/30',           fg: 'text-[#c9d1ff]',       label: 'Vorschau' },
  paid:       { bg: 'bg-[#069e7c]/25',           fg: 'text-[#7fe8c8]',       label: 'Bezahlt' },
  downloaded: { bg: 'bg-[#069e7c]/40',           fg: 'text-white',           label: 'Heruntergeladen' },
};

export function StatusBadge({ status }: { status: BerichtStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium tracking-wide font-[family-name:var(--font-inter)] ${s.bg} ${s.fg}`}
    >
      {s.label}
    </span>
  );
}
