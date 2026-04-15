import type { MetadataRoute } from 'next'

const BASE = 'https://fund24.io'

// Statische Routen, die wir proaktiv indexieren. Dynamische Detail-Seiten
// (/programme/:id, /berater/:id, /aktuelles/:slug) könnten später über die
// jeweilige API nachgezogen werden; fürs Erste reichen die Landing-Pages.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const routes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/foerder-schnellcheck`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/programme`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/berater`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/aktuelles`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/preise`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE}/registrieren`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE}/impressum`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/datenschutz`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/agb`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
  return routes
}
