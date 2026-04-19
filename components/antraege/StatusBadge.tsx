// StatusBadge — Light-Mode Antrag-Status für /dashboard/unternehmen/antraege.

import type { Antrag } from '@/lib/api/fund24';

const STYLE: Record<Antrag['status'], { bg: string; fg: string; label: string }> = {
  entwurf:     { bg: 'bg-muted',  fg: 'text-foreground/80',  label: 'Entwurf' },
  eingereicht: { bg: 'bg-primary/15',   fg: 'text-primary',   label: 'Eingereicht' },
  bewilligt:   { bg: 'bg-chart-5/15',  fg: 'text-chart-5',  label: 'Bewilligt' },
  abgelehnt:   { bg: 'bg-destructive/15',    fg: 'text-destructive',    label: 'Abgelehnt' },
};

export function AntragStatusBadge({ status }: { status: Antrag['status'] }) {
  const s = STYLE[status] ?? STYLE.entwurf;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${s.bg} ${s.fg}`}>
      {s.label}
    </span>
  );
}
