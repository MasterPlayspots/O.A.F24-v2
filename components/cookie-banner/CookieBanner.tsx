'use client';

// DSGVO-konformer Cookie-Banner. Zeigt beim ersten Besuch + bleibt dismissed
// in localStorage. Essenzielle Cookies sind technisch erforderlich (Session,
// CSRF, Rate-Limit) und brauchen keine Einwilligung. Analytics/Sentry nur
// bei explizitem "Alle akzeptieren".

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'fund24-cookie-consent';

type Consent = 'accepted' | 'essential-only';

function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'accepted' || v === 'essential-only' ? v : null;
  } catch {
    return null;
  }
}

function writeConsent(v: Consent) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
    window.dispatchEvent(new CustomEvent('fund24:consent', { detail: v }));
  } catch {
    // ignore
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const handle = (v: Consent) => {
    writeConsent(v);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie-Hinweis"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl bg-architect-surface-low/95 backdrop-blur-md rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-6 sm:p-8 text-white">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg text-white mb-2">
              Datenschutz auf fund24
            </h2>
            <p className="font-body text-sm text-white/80 leading-relaxed">
              Wir nutzen technisch notwendige Cookies, damit Login, Sicherheit und
              Grundfunktionen der Plattform zuverlässig funktionieren. Zusätzlich möchten
              wir anonymisiertes Fehler-Tracking verwenden, um Probleme schneller zu
              beheben. Details findest du in unserer{' '}
              <Link href="/datenschutz" className="text-architect-primary-light underline hover:text-white">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[180px] shrink-0">
            <button
              type="button"
              onClick={() => handle('accepted')}
              className="px-5 py-2.5 rounded-md font-display font-semibold text-sm text-white tracking-wide
                         bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110
                         shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition"
            >
              Alle akzeptieren
            </button>
            <button
              type="button"
              onClick={() => handle('essential-only')}
              className="px-5 py-2.5 rounded-md font-body text-sm text-white/80 tracking-wide
                         bg-architect-surface/60 hover:bg-architect-surface/80 transition"
            >
              Nur notwendige
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function getConsent(): Consent | null {
  return readConsent();
}
