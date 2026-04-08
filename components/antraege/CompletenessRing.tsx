'use client';

// CompletenessRing — SVG Donut 0–100 % für Antrag-Vollständigkeit.
// Architect-Stil: tonal, weicher Übergang, kein border.

export function CompletenessRing({ percent, size = 120 }: { percent: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = clamped >= 90 ? '#069e7c' : clamped >= 50 ? '#6575ad' : '#ba1a1a';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(115,118,136,0.35)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold text-white tracking-tight">
          {clamped}%
        </span>
        <span className="font-body text-[10px] uppercase tracking-widest text-white/60">
          Vollständig
        </span>
      </div>
    </div>
  );
}
