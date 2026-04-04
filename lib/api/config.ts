// lib/api/config.ts

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value && typeof window !== 'undefined') {
    console.error(`[fund24] Fehlende Umgebungsvariable: ${key}`)
  }
  return value ?? ''
}

export const API = {
  CHECK:    requireEnv('NEXT_PUBLIC_CHECK_API_URL'),
  FUND24:   requireEnv('NEXT_PUBLIC_FUND24_API_URL'),
} as const
