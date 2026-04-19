// lib/api/config.ts

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value && typeof window === 'undefined') {
    // Auf dem Server hart fehlschlagen — niemals stille leere URLs.
    throw new Error(
      `[fund24] Fehlende Umgebungsvariable: ${key}. ` +
        `In Vercel Dashboard → Settings → Environment Variables setzen.`
    )
  }
  return value ?? ''
}

export const API = {
  CHECK:  requireEnv('NEXT_PUBLIC_CHECK_API_URL'),
  FUND24: requireEnv('NEXT_PUBLIC_FUND24_API_URL'),
} as const
