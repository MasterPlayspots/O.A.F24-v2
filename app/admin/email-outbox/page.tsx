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
  queued:  'bg-architect-surface-low/40 text-white/80',
  sending: 'bg-architect-primary/20 text-architect-primary-light',
  sent:    'bg-architect-tertiary/25 text-architect-tertiary-light',
  failed:  'bg-architect-error/20 text-architect-error-container',
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
    <div className="min-h-screen bg-architect-surface font-body text-white">
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-white">Email Outbox</h1>
        <p className="text-sm text-white/60 mt-1">
          Versand-Queue für transaktionale E-Mails. Nur für Administratoren.
        </p>
      </div>

      {/* Filter-Bar */}
      <Card className="p-5 mb-6 bg-architect-surface/60 border-0 text-white backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full h-9 px-3 rounded-md bg-architect-surface-low/40 text-sm text-white"
            >
              <option value="">Alle</option>
              <option value="queued">In Queue</option>
              <option value="sending">Wird gesendet</option>
              <option value="sent">Versendet</option>
              <option value="failed">Fehlgeschlagen</option>
            </select>
          </div>
          <Button onClick={() => load(true)} disabled={loading} className="bg-architect-primary hover:bg-architect-primary-container text-white">
            {loading ? <LadeSpinner /> : 'Filtern'}
          </Button>
        </div>
      </Card>

      {fehler && <div className="mb-6"><FehlerBox fehler={fehler} /></div>}

      {/* Tabelle */}
      <Card className="overflow-hidden bg-architect-surface/60 border-0 text-white">
        {loading ? (
          <div className="p-12 flex justify-center"><LadeSpinner /></div>
        ) : mails.length === 0 ? (
          <div className="p-12 text-center text-white/50">
            Keine E-Mails in der Queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-architect-surface-low/30 text-white/70">
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
                      className={i % 2 === 0 ? '' : 'bg-architect-surface-low/30'}
                    >
                      <td className="px-5 py-3 text-white/80 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString('de-DE')}
                      </td>
                      <td className="px-5 py-3 text-white/80 truncate max-w-[200px]" title={empf}>
                        {empf}
                      </td>
                      <td className="px-5 py-3 text-white truncate max-w-[260px]" title={m.subject}>
                        {m.subject || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[m.status]}`}>
                          {STATUS_LABEL[m.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-white/70" title={m.error ?? ''}>
                        <span className="font-mono text-xs">{truncate(m.error, 60)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {m.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(m.id)}
                            disabled={retrying === m.id}
                            className="bg-architect-surface-low/40 border-0 text-white hover:bg-architect-surface-low/60 hover:text-white"
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
          <Button variant="outline" onClick={() => load(false)} disabled={loadingMore} className="bg-architect-surface/60 border-0 text-white hover:bg-architect-surface/40 hover:text-white">
            {loadingMore ? <LadeSpinner /> : 'Mehr laden'}
          </Button>
        </div>
      )}
    </div>
    </div>
  )
}
