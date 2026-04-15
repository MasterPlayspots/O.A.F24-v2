'use client';

// EmptyState — einheitlicher Empty-State für alle Listen.
// Architect Dark, mit optional CTA (Link oder Button).
import Link from 'next/link';
import type { ReactNode } from 'react';

interface BaseProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}

interface LinkCTA {
  cta: { href: string; label: string };
}

interface ButtonCTA {
  cta: { onClick: () => void; label: string };
}

type Props = BaseProps & Partial<LinkCTA & ButtonCTA>;

export function EmptyState({ icon, title, description, cta }: Props) {
  const hasHref = cta && 'href' in cta;
  const hasClick = cta && 'onClick' in cta;

  return (
    <div className="bg-architect-surface/60 rounded-lg p-12 text-center text-white">
      {icon && (
        <div className="w-12 h-12 text-white/40 mx-auto mb-4 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h2 className="font-display text-xl font-semibold text-white mb-2 tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-white/60 max-w-md mx-auto mb-6">
          {description}
        </p>
      )}
      {hasHref && cta && 'href' in cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center px-5 py-2.5 rounded-md font-display font-semibold text-sm text-white tracking-wide
                     bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110
                     shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition"
        >
          {cta.label}
        </Link>
      )}
      {hasClick && cta && 'onClick' in cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="inline-flex items-center px-5 py-2.5 rounded-md font-display font-semibold text-sm text-white tracking-wide
                     bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110
                     shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
