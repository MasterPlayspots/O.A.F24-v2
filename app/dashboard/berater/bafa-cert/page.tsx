'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import {
  getBafaCertStatus,
  uploadBafaCert,
  type BafaCertStatus,
} from '@/lib/api/berater'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard'
import { useMount } from '@/lib/hooks/useMount'

const MAX_BYTES = 5 * 1024 * 1024
const BAFA_NR_PATTERN = /^[A-Za-z0-9\s./-]{3,64}$/

type StatusTone = {
  label: string
  classes: string
  description: string
}

const TONE: Record<BafaCertStatus, StatusTone> = {
  none: {
    label: 'Kein Zertifikat eingereicht',
    classes: 'bg-white/10 text-white/80',
    description:
      'Reiche dein BAFA-Zertifikat als PDF ein, damit wir dich als zertifizierter Berater freischalten können.',
  },
  pending: {
    label: 'In Prüfung',
    classes: 'bg-architect-primary/30 text-white',
    description:
      'Dein Zertifikat liegt beim Admin-Team. Wir melden uns, sobald die Prüfung abgeschlossen ist.',
  },
  approved: {
    label: 'Freigegeben',
    classes: 'bg-architect-tertiary/40 text-white',
    description:
      'Dein Profil ist als BAFA-zertifiziert markiert. Du kannst jederzeit ein aktualisiertes Zertifikat nachreichen.',
  },
  rejected: {
    label: 'Abgelehnt',
    classes: 'bg-architect-error/30 text-architect-error-container',
    description:
      'Dein zuletzt eingereichtes Zertifikat wurde nicht akzeptiert. Bitte lade eine aktuelle und lesbare Version hoch.',
  },
}

export default function BafaCertPage() {
  const mounted = useMount()
  const { loading: verifying } = useVerifiedGuard()

  const [status, setStatus] = useState<BafaCertStatus>('none')
  const [uploadedAt, setUploadedAt] = useState<string | null>(null)
  const [bafaNr, setBafaNr] = useState<string>('')
  const [bafaNrInput, setBafaNrInput] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!mounted || verifying) return
    let active = true
    ;(async () => {
      try {
        const r = await getBafaCertStatus()
        if (!active) return
        setStatus(r.status)
        setUploadedAt(r.uploaded_at)
        setBafaNr(r.bafa_berater_nr ?? '')
        setBafaNrInput(r.bafa_berater_nr ?? '')
      } catch (err) {
        Sentry.captureException(err, {
          tags: { area: 'berater', op: 'bafa-cert-status' },
        })
        if (active) setError('Status konnte nicht geladen werden.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [mounted, verifying])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setError(null)
    setSuccess(null)
    if (!f) {
      setFile(null)
      return
    }
    if (f.type && f.type !== 'application/pdf') {
      setError('Nur PDF-Dateien sind erlaubt.')
      setFile(null)
      return
    }
    if (f.size > MAX_BYTES) {
      setError('Datei ist größer als 5 MB. Bitte komprimieren.')
      setFile(null)
      return
    }
    setFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!file) {
      setError('Bitte eine PDF-Datei auswählen.')
      return
    }
    const trimmedNr = bafaNrInput.trim()
    if (!BAFA_NR_PATTERN.test(trimmedNr)) {
      setError('BAFA-Berater-Nummer hat ein ungültiges Format.')
      return
    }
    setSubmitting(true)
    try {
      const r = await uploadBafaCert(file, trimmedNr)
      setStatus(r.status)
      setUploadedAt(r.uploaded_at)
      setBafaNr(r.bafa_berater_nr)
      setFile(null)
      setSuccess('Zertifikat hochgeladen. Es wird jetzt vom Admin-Team geprüft.')
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: 'berater', op: 'bafa-cert-upload' },
      })
      setError(
        err instanceof Error
          ? err.message
          : 'Upload fehlgeschlagen. Bitte später erneut versuchen.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted || verifying || loading) return <LadeSpinner />

  const tone = TONE[status]
  const formattedUploadedAt = uploadedAt
    ? new Date(uploadedAt).toLocaleString('de-DE')
    : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Berater · Zertifizierung
        </p>
        <h1 className="font-display text-3xl font-bold text-white">
          BAFA-Zertifikat
        </h1>
        <p className="text-white/70 max-w-2xl">
          Lade dein aktuelles BAFA-Zertifikat hoch, damit wir dich als
          zertifizierten Berater ausweisen können. Nur PDFs, maximal 5 MB.
        </p>
      </div>

      <Card className="bg-architect-surface/60 border-0 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">
            Aktueller Status
          </h2>
          <Badge className={tone.classes}>{tone.label}</Badge>
        </div>
        <p className="text-sm text-white/70">{tone.description}</p>
        {bafaNr && (
          <p className="text-xs text-white/60">
            <span className="font-semibold text-white/80">BAFA-Berater-Nr.:</span>{' '}
            {bafaNr}
          </p>
        )}
        {formattedUploadedAt && (
          <p className="text-xs text-white/60">
            <span className="font-semibold text-white/80">Zuletzt eingereicht:</span>{' '}
            {formattedUploadedAt}
          </p>
        )}
      </Card>

      {error && <FehlerBox fehler={error} />}
      {success && (
        <div className="rounded-lg bg-architect-tertiary/20 p-4 text-sm text-white">
          {success}
        </div>
      )}

      <Card className="bg-architect-surface/60 border-0 p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold text-white">
          {status === 'approved'
            ? 'Zertifikat aktualisieren (optional)'
            : 'Zertifikat einreichen'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="bafa-nr"
              className="text-sm font-medium text-white/80"
            >
              BAFA-Berater-Nr.
            </label>
            <input
              id="bafa-nr"
              type="text"
              value={bafaNrInput}
              onChange={(e) => setBafaNrInput(e.target.value)}
              required
              pattern="[A-Za-z0-9\s./-]{3,64}"
              placeholder="z.B. DE-123-456"
              className="w-full rounded-md bg-architect-surface-low/40 border-0 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-architect-primary-light"
            />
            <p className="text-xs text-white/50">
              3–64 Zeichen, erlaubt: Buchstaben, Ziffern, <code>.</code>,{' '}
              <code>-</code>, <code>/</code>, Leerzeichen.
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="bafa-file"
              className="text-sm font-medium text-white/80"
            >
              Zertifikat (PDF, max. 5 MB)
            </label>
            <input
              id="bafa-file"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              required
              className="block w-full text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-architect-primary file:text-white file:text-sm file:font-semibold hover:file:brightness-110"
            />
            {file && (
              <p className="text-xs text-white/50">
                Ausgewählt: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Wird hochgeladen …' : 'Zur Prüfung einreichen'}
          </Button>
        </form>

        <p className="text-xs text-white/50 pt-4 border-t border-white/10">
          Hinweis: Ein eingereichtes Zertifikat kann vor Freigabe nicht mehr
          selbst zurückgezogen werden. Solltest du versehentlich eine falsche
          Datei hochgeladen haben, reich einfach die korrekte Version nach —
          der Admin sieht immer die zuletzt eingereichte.
        </p>
      </Card>

      <div>
        <Link
          href="/dashboard/berater"
          className="text-sm text-architect-primary-light hover:text-white"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>
    </div>
  )
}
