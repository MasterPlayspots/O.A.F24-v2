'use client';

// FinalizeButton — sichtbar nur wenn bafa_certified === 1 UND status === 'preview'.
// Subtle gradient (primary → primary_container @135°), no border.

import type { BerichtStatus } from './StatusBadge';

interface Props {
  status: BerichtStatus;
  bafaCertified: boolean;
  loading?: boolean;
  onFinalize: () => void;
}

export function FinalizeButton({ status, bafaCertified, loading, onFinalize }: Props) {
  const allowed = bafaCertified && status === 'preview';

  let hint = '';
  if (!bafaCertified) hint = 'Nur BAFA-zertifizierte Berater können finalisieren.';
  else if (status !== 'preview') hint = `Finalisierung erst im Status "Vorschau" möglich (aktuell: ${status}).`;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={!allowed || loading}
        onClick={onFinalize}
        className={`px-6 py-3 rounded-md font-[family-name:var(--font-manrope)] font-semibold text-white tracking-wide transition
          ${allowed
            ? 'bg-gradient-to-br from-[#6575ad] to-[#4a5a8f] hover:brightness-110 shadow-[0_10px_40px_rgba(101,117,173,0.25)]'
            : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
      >
        {loading ? 'Finalisiere…' : 'Bericht finalisieren'}
      </button>
      {hint && <span className="font-[family-name:var(--font-inter)] text-[11px] text-white/50">{hint}</span>}
    </div>
  );
}
