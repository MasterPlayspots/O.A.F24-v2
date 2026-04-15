'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { useAuth } from '@/lib/store/authStore'
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard'
import { useMount } from '@/lib/hooks/useMount'
import {
  getCronStatus,
  type CronJobEntry,
  type CronJobStatus,
} from '@/lib/api/fund24'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const TONE: Record<CronJobStatus, { label: string; classes: string }> = {
  ok: { label: 'OK', classes: 'bg-architect-tertiary/40 text-white' },
  failed: { label: 'FAILED', classes: 'bg-architect-error/30 text-architect-error-container' },
  missing: { label: 'MISSING', classes: 'bg-white/10 text-white/70' },
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-DE')
}

function fmtDuration(ms?: number): string {
  if (ms === undefined || ms === null) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export default function CronStatusPage() {
  const mounted = useMount()
  const { loading: verifying } = useVerifiedGuard()
  const { nutzer } = useAuth()

  const [jobs, setJobs] = useState<CronJobEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string>('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await getCronStatus()
      setJobs(r)
      setLastRefresh(new Date().toLocaleTimeString('de-DE'))
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: 'admin', op: 'cron-status' },
      })
      setError(
        err instanceof Error
          ? err.message
          : 'Cron-Status konnte nicht geladen werden.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!mounted || verifying) return
    if (!nutzer || nutzer.role !== 'admin') return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, verifying, nutzer?.role])

  if (!mounted || verifying) return <LadeSpinner />
  if (nutzer && nutzer.role !== 'admin') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <FehlerBox fehler="Nur Admins haben Zugriff auf diese Seite." />
      </div>
    )
  }

  const hasFailures = jobs.some((j) => j.status === 'failed')
  const hasMissing = jobs.some((j) => j.status === 'missing')

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Admin · Ops
          </p>
          <h1 className="font-display text-3xl font-bold text-white">
            Cron Status
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Letzter Lauf jedes Scheduled Jobs. Daten aus KV{' '}
            <code className="text-white/80">cron:last:*</code>, TTL 7 Tage.
          </p>
        </div>
        <div className="text-right">
          <Button onClick={load} disabled={loading} variant="outline">
            {loading ? 'Lade …' : 'Neu laden'}
          </Button>
          {lastRefresh && (
            <p className="text-xs text-white/50 mt-2">Zuletzt geladen: {lastRefresh}</p>
          )}
        </div>
      </div>

      {error && <FehlerBox fehler={error} onNeuLaden={load} />}

      {!error && hasFailures && (
        <div className="rounded-lg bg-architect-error/25 p-4 text-sm text-white">
          ⚠ Mindestens ein Cron-Job ist beim letzten Lauf fehlgeschlagen. Details
          unten prüfen und ggf. im Cloudflare Dashboard (Worker → Logs) nach dem
          Stack-Trace schauen.
        </div>
      )}
      {!error && !hasFailures && hasMissing && (
        <div className="rounded-lg bg-white/10 p-4 text-sm text-white/80">
          Einige erwartete Jobs sind noch nicht in KV aufgetaucht. Nach dem
          ersten Run (oder Redeploy) werden sie hier gelistet. TTL ist 7 Tage.
        </div>
      )}

      <Card className="bg-architect-surface/60 border-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-architect-surface-low/40 text-white/60">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Job</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Letzter Lauf</th>
                <th className="text-left px-4 py-3 font-semibold">Dauer</th>
                <th className="text-left px-4 py-3 font-semibold">Fehler / Meta</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const tone = TONE[j.status]
                return (
                  <tr
                    key={j.name}
                    className="border-t border-white/5 text-white/80 align-top"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-white">
                      {j.name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={tone.classes}>{tone.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/70">
                      {fmtTime(j.lastRun)}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/70">
                      {fmtDuration(j.durationMs)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {j.error ? (
                        <code className="text-architect-error-container break-all">
                          {j.error}
                        </code>
                      ) : j.meta ? (
                        <code className="text-white/60 break-all">
                          {JSON.stringify(j.meta)}
                        </code>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div>
        <Link
          href="/admin"
          className="text-sm text-architect-primary-light hover:text-white"
        >
          ← Zurück zum Admin-Dashboard
        </Link>
      </div>
    </div>
  )
}
