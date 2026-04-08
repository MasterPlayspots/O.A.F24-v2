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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Audit-Logs</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Vollständiges Event-Protokoll. Nur für Administratoren.
        </p>
      </div>

      {/* Filter-Bar */}
      <Card className="p-5 mb-6 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              User ID
            </label>
            <Input
              value={filter.user_id}
              onChange={(e) => setFilter((f) => ({ ...f, user_id: e.target.value }))}
              placeholder="u_…"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Event Type
            </label>
            <Input
              value={filter.action}
              onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value }))}
              placeholder="login, antrag.create, …"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Limit
            </label>
            <select
              value={filter.limit}
              onChange={(e) => setFilter((f) => ({ ...f, limit: Number(e.target.value) }))}
              className="w-full h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            >
              {LIMITS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleFilter} disabled={loading}>
            {loading ? <LadeSpinner /> : 'Filtern'}
          </Button>
        </div>
      </Card>

      {fehler && <div className="mb-6"><FehlerBox fehler={fehler} /></div>}

      {/* Tabelle */}
      <Card className="overflow-hidden bg-white dark:bg-slate-900">
        {loading ? (
          <div className="p-12 flex justify-center"><LadeSpinner /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            Keine Logs gefunden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
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
                      className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/30'}
                    >
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString('de-DE')}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                        {l.user_id}
                      </td>
                      <td className="px-5 py-3 text-slate-800 dark:text-white">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                          {pickEventType(l)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300" title={detail}>
                        {truncate(detail, 60)}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
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
          <Button variant="outline" onClick={() => load(false)} disabled={loadingMore}>
            {loadingMore ? <LadeSpinner /> : 'Mehr laden'}
          </Button>
        </div>
      )}
    </div>
  )
}
