import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/onboarding/',
          '/antraege/',
          '/foerdercheck/',
          '/verifizieren',
          '/passwort-reset',
        ],
      },
    ],
    sitemap: 'https://fund24.io/sitemap.xml',
    host: 'https://fund24.io',
  }
}
