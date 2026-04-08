'use client';

// ACLList — Wer hat Zugriff auf den Antrag (owner/editor/viewer/reviewer).

import type { AntragZugriff } from '@/lib/api/fund24';

const ROLLE_STYLE: Record<string, { bg: string; fg: string }> = {
  editor:   { bg: 'bg-architect-primary/30', fg: 'text-architect-primary-light' },
  viewer:   { bg: 'bg-architect-surface/50', fg: 'text-white/80' },
  reviewer: { bg: 'bg-architect-tertiary/25', fg: 'text-architect-tertiary-light' },
};

interface Props {
  zugriffe: AntragZugriff[];
  onRevoke: (zugriffId: string) => void;
  revoking?: string | null;
}

export function ACLList({ zugriffe, onRevoke, revoking }: Props) {
  if (zugriffe.length === 0) {
    return (
      <div className="bg-architect-surface-low/30 rounded-lg p-8 text-center">
        <p className="font-body text-sm text-white/50">
          Noch niemand eingeladen.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {zugriffe.map((z) => {
        const name =
          [z.first_name, z.last_name].filter(Boolean).join(' ') || z.user_email || z.berater_id || z.user_id || '—';
        const rs = ROLLE_STYLE[z.rolle] ?? ROLLE_STYLE.viewer;
        return (
          <div
            key={z.id}
            className="flex items-center justify-between gap-4 bg-architect-surface-low/40 rounded-md px-5 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm text-white truncate">{name}</p>
              {z.user_email && (
                <p className="font-body text-xs text-white/40 truncate">{z.user_email}</p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-md text-xs font-medium font-body ${rs.bg} ${rs.fg}`}
            >
              {z.rolle}
            </span>
            <button
              type="button"
              onClick={() => onRevoke(z.id)}
              disabled={revoking === z.id}
              className="font-body text-xs text-architect-error-container/70 hover:text-architect-error-container disabled:opacity-40 transition"
            >
              {revoking === z.id ? '…' : 'Entziehen'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
