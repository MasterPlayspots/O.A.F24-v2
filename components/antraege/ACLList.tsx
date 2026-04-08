'use client';

// ACLList — Wer hat Zugriff auf den Antrag (owner/editor/viewer/reviewer).

import type { AntragZugriff } from '@/lib/api/fund24';

const ROLLE_STYLE: Record<string, { bg: string; fg: string }> = {
  editor:   { bg: 'bg-[#6575ad]/30', fg: 'text-[#c9d1ff]' },
  viewer:   { bg: 'bg-[#737688]/50', fg: 'text-white/80' },
  reviewer: { bg: 'bg-[#069e7c]/25', fg: 'text-[#7fe8c8]' },
};

interface Props {
  zugriffe: AntragZugriff[];
  onRevoke: (zugriffId: string) => void;
  revoking?: string | null;
}

export function ACLList({ zugriffe, onRevoke, revoking }: Props) {
  if (zugriffe.length === 0) {
    return (
      <div className="bg-[#637c74]/30 rounded-lg p-8 text-center">
        <p className="font-[family-name:var(--font-inter)] text-sm text-white/50">
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
            className="flex items-center justify-between gap-4 bg-[#637c74]/40 rounded-md px-5 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-inter)] text-sm text-white truncate">{name}</p>
              {z.user_email && (
                <p className="font-[family-name:var(--font-inter)] text-xs text-white/40 truncate">{z.user_email}</p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-md text-xs font-medium font-[family-name:var(--font-inter)] ${rs.bg} ${rs.fg}`}
            >
              {z.rolle}
            </span>
            <button
              type="button"
              onClick={() => onRevoke(z.id)}
              disabled={revoking === z.id}
              className="font-[family-name:var(--font-inter)] text-xs text-[#ffdad6]/70 hover:text-[#ffdad6] disabled:opacity-40 transition"
            >
              {revoking === z.id ? '…' : 'Entziehen'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
