import type { MetadataRoute } from 'next'

const BASE = 'https://fund24.io'
const API = 'https://api.fund24.io'

// Static landing/legal/auth routes
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1.0 },
  { url: `${BASE}/foerder-schnellcheck`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${BASE}/programme`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE}/berater`, changeFrequency: 'daily', priority: 0.8 },
  { url: `${BASE}/aktuelles`, changeFrequency: 'weekly', priority: 0.6 },
  { url: `${BASE}/preise`, changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE}/support`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${BASE}/login`, changeFrequency: 'yearly', priority: 0.4 },
  { url: `${BASE}/registrieren`, changeFrequency: 'yearly', priority: 0.5 },
  { url: `${BASE}/impressum`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${BASE}/datenschutz`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${BASE}/agb`, changeFrequency: 'yearly', priority: 0.3 },
]

interface KatalogItem { id: number | string }
interface BeraterItem { id: string }

async function fetchProgrammIds(): Promise<string[]> {
  try {
    // Large page size — Worker caps at 50 per page, pull 200 via iteration
    const ids: string[] = []
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`${API}/api/foerdermittel/katalog?page=${page}&pageSize=50`, {
        next: { revalidate: 3600 },
      })
      if (!res.ok) break
      const data = (await res.json()) as { results?: KatalogItem[]; total?: number }
      const rows = data.results ?? []
      if (rows.length === 0) break
      for (const r of rows) ids.push(String(r.id))
      if (rows.length < 50) break
    }
    return ids
  } catch {
    return []
  }
}

async function fetchBeraterIds(): Promise<string[]> {
  try {
    const res = await fetch(`${API}/api/netzwerk/berater?pageSize=200`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { profiles?: BeraterItem[] }
    return (data.profiles ?? []).map((b) => b.id)
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const [programmIds, beraterIds] = await Promise.all([fetchProgrammIds(), fetchBeraterIds()])

  const programme: MetadataRoute.Sitemap = programmIds.map((id) => ({
    url: `${BASE}/programme/${id}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const berater: MetadataRoute.Sitemap = beraterIds.map((id) => ({
    url: `${BASE}/berater/${id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [
    ...STATIC_ROUTES.map((r) => ({ ...r, lastModified: now })),
    ...programme,
    ...berater,
  ]
}
