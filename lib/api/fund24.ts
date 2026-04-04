// lib/api/fund24.ts — fund24-api Worker Client
// Worker base: /api/foerdermittel — all responses wrapped in { success, data/pagination }
import { apiCall } from './client'
import { API } from './config'
import type { StatsResponse, FilterOptions, ProgrammeResponse, Foerderprogramm } from '../types'

// ── Worker response shapes ────────────────────────────────────
interface WorkerKatalogResponse {
  success: boolean
  data: Record<string, unknown>[]
  pagination: { total: number; page: number; pageSize: number; totalPages: number }
}

interface WorkerFiltersResponse {
  success: boolean
  data: {
    foerderart: string[]
    foerderbereich: string[]
    foerdergebiet: string[]
    foerderberechtigte: string[]
  }
}

interface WorkerDetailResponse {
  success: boolean
  data: Record<string, unknown>
}

// ── Public API ────────────────────────────────────────────────

export async function getStats(): Promise<StatsResponse> {
  // No dedicated stats endpoint — fetch minimal katalog page to get total count
  const raw = await apiCall<WorkerKatalogResponse>(
    API.FUND24,
    '/api/foerdermittel/katalog?pageSize=1'
  )
  return {
    total: raw.pagination?.total ?? 0,
    bundesweit: raw.pagination?.total ?? 0,
    bundeslaender: 16,
  }
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const raw = await apiCall<WorkerFiltersResponse>(
    API.FUND24,
    '/api/foerdermittel/katalog/filters'
  )
  return {
    foerderarten: raw.data?.foerderart ?? [],
    foerderbereiche: raw.data?.foerderbereich ?? [],
  }
}

interface ProgrammeFilter {
  bundesland?: string
  foerderart?: string
  foerderbereich?: string
  suche?: string
  limit?: number
  offset?: number
}

export async function getProgramme(filter?: ProgrammeFilter): Promise<ProgrammeResponse> {
  const params = new URLSearchParams()
  // Worker uses foerdergebiet for region, not bundesland
  if (filter?.bundesland) params.set('foerdergebiet', filter.bundesland)
  if (filter?.foerderart) params.set('foerderart', filter.foerderart)
  if (filter?.foerderbereich) params.set('foerderbereich', filter.foerderbereich)
  // Worker uses 'search', not 'suche'
  if (filter?.suche) params.set('search', filter.suche)

  const limit = filter?.limit ?? 20
  const offset = filter?.offset ?? 0
  const page = Math.floor(offset / limit) + 1
  params.set('pageSize', String(limit))
  params.set('page', String(page))

  const qs = params.toString()
  const raw = await apiCall<WorkerKatalogResponse>(
    API.FUND24,
    `/api/foerdermittel/katalog${qs ? `?${qs}` : ''}`
  )

  // Map worker response → frontend ProgrammeResponse
  return {
    results: (raw.data ?? []).map(mapProgramm),
    total: raw.pagination?.total ?? 0,
    limit,
    offset,
  }
}

export async function getProgramm(id: number): Promise<Foerderprogramm> {
  const raw = await apiCall<WorkerDetailResponse>(
    API.FUND24,
    `/api/foerdermittel/katalog/${id}`
  )
  return mapProgramm(raw.data ?? {})
}

// ── Field mapper (worker snake_case → frontend interface) ─────
function mapProgramm(row: Record<string, unknown>): Foerderprogramm {
  return {
    id: row.id as number,
    titel: (row.titel as string) ?? '',
    foerderart: (row.foerderart as string) ?? '',
    foerderbereich: (row.foerderbereich as string) ?? '',
    foerdergebiet: (row.foerdergebiet as string) ?? '',
    foerderhoehe_min: row.foerderhoehe_min as number | undefined,
    foerderhoehe_max: row.foerderhoehe_max as number | undefined,
    foerdersatz_pct: row.foerdersatz_pct as number | undefined,
    kurztext: (row.kurztext as string) ?? '',
    antragsteller: (row.foerderberechtigte as string) ?? '',
    status: (row.status as string) ?? '',
  }
}
