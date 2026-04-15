'use client';

// ConsentGatedAnalytics — mounts Vercel Analytics + Speed Insights only
// after the user has given consent via CookieBanner. Listens to the
// `fund24:consent` window event dispatched by the banner, plus a
// localStorage read on mount for repeat visitors.
import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const STORAGE_KEY = 'fund24-cookie-consent';

function hasAccepted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'accepted';
  } catch {
    return false;
  }
}

export function ConsentGatedAnalytics() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    setAccepted(hasAccepted());
    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setAccepted(detail === 'accepted');
    };
    window.addEventListener('fund24:consent', onConsent);
    return () => window.removeEventListener('fund24:consent', onConsent);
  }, []);

  if (!accepted) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
