'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/store/authStore'
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard'
import { getCheck, getMatching, sendeAnfrage } from '@/lib/api/check'
import type { CheckSession, ChatNachricht, CheckErgebnis, BeraterMatch } from '@/lib/types'
import { SchrittAnzeige } from '@/components/shared/SchrittAnzeige'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErgebnisKarte } from '@/components/foerdercheck/ErgebnisKarte'
import { BeraterMatchKarte } from '@/components/foerdercheck/BeraterMatchKarte'
import { generateFoerdercheckPDF } from '@/lib/pdf/foerdercheck-report'
import { toast } from 'sonner'
import { Download, CheckCircle2 } from 'lucide-react'

const SCHRITTE = ['Angaben', 'Chat', 'Dokumente', 'Analyse', 'Ergebnisse']

interface CombinedCheck extends CheckSession {
  nachrichten: ChatNachricht[]
  ergebnisse: CheckErgebnis[]
}

export default function ErgebnissePage() {
  const { loading } = useVerifiedGuard()
  const { token } = useAuth()
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [check, setCheck] = useState<CombinedCheck | null>(null)
  const [berater, setBerater] = useState<BeraterMatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!token || !sessionId) return

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [checkData, matchingData] = await Promise.all([
          getCheck(sessionId, token),
          getMatching(sessionId, token),
        ])

        setCheck(checkData)
        setBerater(matchingData.berater.slice(0, 3)) // Top 3 berater
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fehler beim Laden der Ergebnisse'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [token, sessionId])

  const handleSendRequest = async (beraterId: string) => {
    if (!token || !sessionId) return

    try {
      setError(null)
      await sendeAnfrage(
        {
          anUserId: beraterId,
          checkId: sessionId,
        },
        token
      )
      setSentRequests((prev) => new Set([...prev, beraterId]))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Senden der Anfrage'
      setError(message)
    }
  }

  const handleDownloadPDF = async () => {
    if (!check) return
    try {
      await generateFoerdercheckPDF({
        sessionId,
        unternehmen: check.firmenname || 'Unbekannt',
        programme: (check.ergebnisse ?? []).map((e) => {
          const name =
            (e as unknown as { titel?: string; name?: string; programm_name?: string }).titel ??
            (e as unknown as { name?: string; programm_name?: string }).name ??
            (e as unknown as { programm_name?: string }).programm_name ??
            'Programm'
          const foerderart = (e as unknown as { foerderart?: string }).foerderart
          const foerderbetrag =
            (e as unknown as { foerderbetrag?: string; max_betrag?: string }).foerderbetrag ??
            (e as unknown as { max_betrag?: string }).max_betrag
          const scoreRaw = (e as unknown as { relevanz_score?: number; score?: number })
            .relevanz_score ??
            (e as unknown as { score?: number }).score
          return {
            name,
            foerderart,
            foerderbetrag,
            score: typeof scoreRaw === 'number' ? Math.round(scoreRaw) : undefined,
          }
        }),
        erstelltAm: new Date().toLocaleDateString('de-DE'),
      })
      toast.success('PDF wurde heruntergeladen')
    } catch (err) {
      toast.error('PDF konnte nicht erstellt werden')
      // eslint-disable-next-line no-console
      console.error('PDF generation failed:', err)
    }
  }

  if (loading || isLoading) {
    return <LadeSpinner text="Ergebnisse werden geladen..." />
  }

  if (!check) {
    return <FehlerBox fehler="Ergebnisse konnten nicht geladen werden" />
  }

  const resultCount = check.ergebnisse?.length || 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="mx-auto max-w-4xl">
        <SchrittAnzeige schritte={SCHRITTE} aktuell={4} />

        <Card className="mb-6 p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">Ihre Fördercheck-Ergebnisse</h1>
              <p className="mt-2 text-muted-foreground">
                {resultCount} passende Programme für {check.firmenname}
              </p>
            </div>
            <CheckCircle2 className="h-12 w-12 text-chart-5" />
          </div>
        </Card>

        {error && (
          <div className="mb-6">
            <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />
          </div>
        )}

        {/* Results Section */}
        {resultCount > 0 && (
          <div className="mb-12">
            <h2 className="mb-4 text-2xl font-bold">Matching Programme</h2>
            <div className="grid gap-6">
              {check.ergebnisse.map((ergebnis) => (
                <ErgebnisKarte key={ergebnis.id} ergebnis={ergebnis} />
              ))}
            </div>
          </div>
        )}

        {/* Berater Section */}
        {berater.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-4 text-2xl font-bold">Empfohlene Berater</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Diese Berater haben Expertise in Ihren Förderbereichen
            </p>
            <div className="grid gap-6">
              {berater.map((match) => (
                <BeraterMatchKarte
                  key={match.berater.id}
                  berater={match}
                  onAnfrage={() => handleSendRequest(match.berater.id)}
                  anfrageGesendet={sentRequests.has(match.berater.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/unternehmen')}
            className="flex-1"
          >
            Zum Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Ergebnisse als PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
