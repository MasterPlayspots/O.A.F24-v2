import Link from 'next/link'
import type { ReactNode } from 'react'

interface LeererZustandProps {
  titel: string
  beschreibung?: string
  icon?: ReactNode
  cta?: { text: string; href: string }
}

// Architect Dark Empty-State. Wird noch an einigen Stellen genutzt;
// für neue Stellen bitte `EmptyState` (components/shared/EmptyState.tsx)
// verwenden — identische Optik, etwas bessere API.
export function LeererZustand({ titel, beschreibung, icon, cta }: LeererZustandProps) {
  return (
    <div className="bg-architect-surface/60 rounded-lg p-12 text-center text-white">
      {icon && (
        <div className="w-12 h-12 text-white/40 mx-auto mb-4 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl font-semibold text-white mb-2 tracking-tight">{titel}</h3>
      {beschreibung && (
        <p className="text-sm text-white/60 max-w-md mx-auto mb-6">{beschreibung}</p>
      )}
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center px-5 py-2.5 rounded-md font-display font-semibold text-sm text-white tracking-wide
                     bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110
                     shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition"
        >
          {cta.text}
        </Link>
      )}
    </div>
  )
}
