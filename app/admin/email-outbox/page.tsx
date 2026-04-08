'use client'

// /admin/email-outbox — Email Queue Admin-Sicht (Admin only).
// Stil: matched /admin/audit-logs (Card + dark: Variants).

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/store/authStore'
import { listEmailOutbox, retryEmail, type EmailOutbox, type EmailOutboxStatus } from '@/lib/api/fund24'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { RefreshCw } from 'lucide-react'

const LIMIT = 50

const STATUS_STYLE: Record<EmailOutboxStatus, string> = {
  queued:  'bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300',
  sending: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  sent:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  failed:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
}

const STATUS_LABEL: Record<EmailOutboxStatus, string> = {
  queued: 'In Queue',
  sending: 'Wird gesendet',
  sent: 'Versendet',
  failed: 'Fehlgeschlagen',
}

function truncate(s: string | null | undefined, max: number) {
  if (!s) return '—'
  return s.length > max ? s.slice(0, max) + '…' : s
}

type StatusFilter = '' | EmailOutboxStatus

export default function EmailOutboxPage() {
  const router = useRouter()
  const { token, istAdmin } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [mails, setMails] = useState<EmailOutbox[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    if (!token) { router.replace('/login'); return }
    if (!istAdmin()) { router.replace('/') }
  }, [token, istAdmin, router])

  const load = useCallback(async (reset: boolean) => {
    const nextOffset = reset ? 0 : offset
    if (reset) setLoading(true); else setLoadingMore(true)
    setFehler('')
    try {
      const res = await listEmailOutbox({
        status: statusFilter || undefined,
        limit: LIMIT,
        offset: nextOffset,
      })
      const results = res?.results ?? []
      setMails((prev) => (reset ? results : [...prev, ...results]))
      setOffset(nextOffset + results.length)
      setHasMore(results.length === LIMIT)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Email-Queue konnte nicht geladen werden.')
    } finally {
      if (reset) setLoading(false); else setLoadingMore(false)
    }
  }, [statusFilter, offset])

  useEffect(() => {
    if (!token || !istAdmin()) return
    load(true)
    // initial load only — Filter-Reload via Button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleRetry = async (id: string) => {
    setRetrying(id)
    try {
      await retryEmail(id)
      // Optimistic: status auf 'queued' setzen, error leeren
      setMails((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'queued', error: null } : m))
      )
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Erneutes Senden fehlgeschlagen.')
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Email Outbox</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Versand-Queue für transaktionale E-Mails. Nur für Administratoren.
        </p>
      </div>

      {/* Filter-Bar */}
      <Card className="p-5 mb-6 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            >
              <option value="">Alle</option>
              <option value="queued">In Queue</option>
              <option value="sending">Wird gesendet</option>
              <option value="sent">Versendet</option>
              <option value="failed">Fehlgeschlagen</option>
            </select>
          </div>
          <Button onClick={() => load(true)} disabled={loading}>
            {loading ? <LadeSpinner /> : 'Filtern'}
          </Button>
        </div>
      </Card>

      {fehler && <div className="mb-6"><FehlerBox fehler={fehler} /></div>}

      {/* Tabelle */}
      <Card className="overflow-hidden bg-white dark:bg-slate-900">
        {loading ? (
          <div className="p-12 flex justify-center"><LadeSpinner /></div>
        ) : mails.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            Keine E-Mails in der Queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                <tr className="text-left">
                  <th className="px-5 py-3 font-semibold">Zeitstempel</th>
                  <th className="px-5 py-3 font-semibold">Empfänger</th>
                  <th className="px-5 py-3 font-semibold">Betreff</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Fehler</th>
                  <th className="px-5 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {mails.map((m, i) => {
                  const empf = m.to_email || m.to || '—'
                  return (
                    <tr
                      key={m.id}
                      className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/30'}
                    >
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString('de-DE')}
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-200 truncate max-w-[200px]" title={empf}>
                        {empf}
                      </td>
                      <td className="px-5 py-3 text-slate-800 dark:text-white truncate max-w-[260px]" title={m.subject}>
                        {m.subject || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[m.status]}`}>
                          {STATUS_LABEL[m.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300" title={m.error ?? ''}>
                        <span className="font-mono text-xs">{truncate(m.error, 60)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {m.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(m.id)}
                            disabled={retrying === m.id}
                          >
                            {retrying === m.id ? (
                              <LadeSpinner />
                            ) : (
                              <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Erneut senden</>
                            )}
                          </Button>
                        )}
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
