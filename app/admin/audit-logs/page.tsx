'use client'

// /admin/audit-logs — Audit-Log Viewer (Admin only).
// Stil: matched die existierende Admin-Page (Card-basiert, light + dark: Variants).

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/store/authStore'
import { listAuditLogs, type AuditLog } from '@/lib/api/fund24'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'

interface Filter {
  user_id: string
  action: string
  limit: number
}

const LIMITS = [25, 50, 100] as const

function pickEventType(l: AuditLog): string {
  return l.action || l.event_type || '—'
}
function pickDetail(l: AuditLog): string {
  if (l.detail) return l.detail
  const parts = [l.resource, l.resource_id].filter(Boolean)
  return parts.length ? parts.join(' / ') : '—'
}
function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + '…' : s
}

export default function AuditLogsPage() {
  const router = useRouter()
  const { istAdmin, token } = useAuth()
  const [filter, setFilter] = useState<Filter>({ user_id: '', action: '', limit: 50 })
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    if (!token) { router.replace('/login'); return }
    if (!istAdmin()) { router.replace('/'); }
  }, [token, istAdmin, router])

  const load = useCallback(async (reset: boolean) => {
    const nextOffset = reset ? 0 : offset
    if (reset) setLoading(true); else setLoadingMore(true)
    setFehler('')
    try {
      const res = await listAuditLogs({
        user_id: filter.user_id || undefined,
        action: filter.action || undefined,
        limit: filter.limit,
        offset: nextOffset,
      })
      const results = (res as { results: AuditLog[] }).results ?? []
      setLogs((prev) => (reset ? results : [...prev, ...results]))
      setOffset(nextOffset + results.length)
      setHasMore(results.length === filter.limit)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Audit-Logs konnten nicht geladen werden.')
    } finally {
      if (reset) setLoading(false); else setLoadingMore(false)
    }
  }, [filter, offset])

  useEffect(() => {
    if (!token || !istAdmin()) return
    load(true)
    // initial load only — Filter-Reload via Button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleFilter = () => load(true)

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-white">Audit-Logs</h1>
        <p className="text-sm text-white/60 mt-1">
          Vollständiges Event-Protokoll. Nur für Administratoren.
        </p>
      </div>

      {/* Filter-Bar */}
      <Card className="p-5 mb-6 bg-architect-surface/60 border-0 text-white backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
              User ID
            </label>
            <Input
              value={filter.user_id}
              onChange={(e) => setFilter((f) => ({ ...f, user_id: e.target.value }))}
              placeholder="u_…"
              className="bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
              Event Type
            </label>
            <Input
              value={filter.action}
              onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value }))}
              placeholder="login, antrag.create, …"
              className="bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
              Limit
            </label>
            <select
              value={filter.limit}
              onChange={(e) => setFilter((f) => ({ ...f, limit: Number(e.target.value) }))}
              className="w-full h-9 px-3 rounded-md bg-architect-surface-low/40 text-sm text-white"
            >
              {LIMITS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleFilter} disabled={loading} className="bg-architect-primary hover:bg-architect-primary-container text-white">
            {loading ? <LadeSpinner /> : 'Filtern'}
          </Button>
        </div>
      </Card>

      {fehler && <div className="mb-6"><FehlerBox fehler={fehler} /></div>}

      {/* Tabelle */}
      <Card className="overflow-hidden bg-architect-surface/60 border-0 text-white">
        {loading ? (
          <div className="p-12 flex justify-center"><LadeSpinner /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-white/50">
            Keine Logs gefunden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-architect-surface-low/30 text-white/70">
                <tr className="text-left">
                  <th className="px-5 py-3 font-semibold">Zeitstempel</th>
                  <th className="px-5 py-3 font-semibold">User ID</th>
                  <th className="px-5 py-3 font-semibold">Event Type</th>
                  <th className="px-5 py-3 font-semibold">Detail</th>
                  <th className="px-5 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => {
                  const detail = pickDetail(l)
                  return (
                    <tr
                      key={l.id}
                      className={i % 2 === 0 ? '' : 'bg-architect-surface-low/30'}
                    >
                      <td className="px-5 py-3 text-white/80 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString('de-DE')}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-white/60 truncate max-w-[140px]">
                        {l.user_id}
                      </td>
                      <td className="px-5 py-3 text-white">
                        <span className="inline-block px-2 py-0.5 rounded bg-architect-primary/20 text-architect-primary-light text-xs font-medium">
                          {pickEventType(l)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-white/70" title={detail}>
                        {truncate(detail, 60)}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-white/50">
                        {l.ip ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {hasMore && !loading && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => load(false)} disabled={loadingMore} className="bg-architect-surface/60 border-0 text-white hover:bg-architect-surface/40 hover:text-white">
            {loadingMore ? <LadeSpinner /> : 'Mehr laden'}
          </Button>
        </div>
      )}
    </div>
    </div>
  )
}
