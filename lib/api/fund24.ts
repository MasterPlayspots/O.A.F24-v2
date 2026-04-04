// lib/api/fund24.ts — fund24-api Worker Client
import { apiCall } from './client'
import { API } from './config'
import type { StatsResponse, FilterOptions, ProgrammeResponse, Foerderprogramm } from '../types'

export async function getStats(): Promise<StatsResponse> {
  return apiCall<StatsResponse>(API.FUND24, '/api/stats')
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return apiCall<FilterOptions>(API.FUND24, '/api/filter-options')
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
  if (filter?.bundesland) params.set('bundesland', filter.bundesland)
  if (filter?.foerderart) params.set('foerderart', filter.foerderart)
  if (filter?.foerderbereich) params.set('foerderbereich', filter.foerderbereich)
  if (filter?.suche) params.set('suche', filter.suche)
  if (filter?.limit) params.set('limit', String(filter.limit))
  if (filter?.offset) params.set('offset', String(filter.offset))
  const qs = params.toString()
  return apiCall<ProgrammeResponse>(API.FUND24, `/api/foerderprogramme${qs ? `?${qs}` : ''}`)
}

export async function getProgramm(id: number): Promise<Foerderprogramm> {
  return apiCall<Foerderprogramm>(API.FUND24, `/api/foerderprogramme/${id}`)
}
