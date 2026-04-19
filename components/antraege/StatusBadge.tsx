// StatusBadge — Light-Mode Antrag-Status für /dashboard/unternehmen/antraege.

import type { Antrag } from '@/lib/api/fund24';

const STYLE: Record<Antrag['status'], { bg: string; fg: string; label: string }> = {
  entwurf:     { bg: 'bg-slate-100',  fg: 'text-slate-700',  label: 'Entwurf' },
  eingereicht: { bg: 'bg-blue-100',   fg: 'text-blue-700',   label: 'Eingereicht' },
  bewilligt:   { bg: 'bg-green-100',  fg: 'text-green-700',  label: 'Bewilligt' },
  abgelehnt:   { bg: 'bg-red-100',    fg: 'text-red-700',    label: 'Abgelehnt' },
};

export function AntragStatusBadge({ status }: { status: Antrag['status'] }) {
  const s = STYLE[status] ?? STYLE.entwurf;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${s.bg} ${s.fg}`}>
      {s.label}
    </span>
  );
}
