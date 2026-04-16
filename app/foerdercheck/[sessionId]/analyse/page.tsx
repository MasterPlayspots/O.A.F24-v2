'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/store/authStore'
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard'
import { getCheck } from '@/lib/api/check'
import { SchrittAnzeige } from '@/components/shared/SchrittAnzeige'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle2, Loader2, Circle } from 'lucide-react'

const SCHRITTE = ['Angaben', 'Chat', 'Dokumente', 'Analyse', 'Ergebnisse']

const PHASES = [
  'Bedarfs-Analyst läuft...',
  'Programm-Scanner prüft 3.400+ Programme...',
  'Regional-Experte prüft Bundesland-Programme...',
  'Kumulierungs-Jurist prüft Kombinationen...',
  'Kombinations-Optimierer kalkuliert...',
  'Finanzierungsarchitekt erstellt Plan...',
]

export default function AnalysePage() {
  const { loading } = useVerifiedGuard()
  const { token } = useAuth()
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [currentPhase, setCurrentPhase] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeout, setTimeoutState] = useState(false)

  // Phase switching
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhase((prev) => {
        if (prev < PHASES.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Polling for analysis completion
  useEffect(() => {
    if (!token || !sessionId) return

    let pollCount = 0
    const maxPolls = 40 // 40 polls × 3s = 120s timeout

    const pollStatus = async () => {
      try {
        const data = await getCheck(sessionId, token)

        if (data.status === 'ergebnis') {
          // Analysis complete
          router.push(`/foerdercheck/${sessionId}/ergebnisse`)
          return
        }

        pollCount++
        if (pollCount >= maxPolls) {
          setTimeoutState(true)
          setIsLoading(false)
          return
        }

        // Continue polling
        setTimeout(pollStatus, 3000)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fehler beim Abrufen des Status'
        setError(message)
        setIsLoading(false)
      }
    }

    // Start polling
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        pollStatus()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [token, sessionId, router, isLoading])

  // Handle re-entry: if status is already 'ergebnis', redirect immediately
  useEffect(() => {
    const checkStatus = async () => {
      if (!token || !sessionId) return

      try {
        const data = await getCheck(sessionId, token)
        if (data.status === 'ergebnis') {
          router.push(`/foerdercheck/${sessionId}/ergebnisse`)
        }
      } catch {
        // Ignore errors on initial check
      }
    }

    checkStatus()
  }, [token, sessionId, router])

  if (loading) {
    return <LadeSpinner text="Authentifizierung läuft..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="mx-auto max-w-2xl">
        <SchrittAnzeige schritte={SCHRITTE} aktuell={3} />

        <Card className="p-8">
          <h1 className="mb-2 text-3xl font-bold">Analyse läuft</h1>
          <p className="mb-12 text-muted-foreground">
            Unser Swarm-AI-System analysiert die Daten mit 6 spezialisierten Agenten
          </p>

          {error && (
            <div className="mb-8 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          {timeout ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
                <p className="text-blue-900 font-medium mb-2">Analyse dauert länger als erwartet</p>
                <p className="text-sm text-blue-800 mb-6">
                  Die Analyse wird im Hintergrund fortgesetzt. Sie können zur Übersicht zurückkehren
                  und später auf die Ergebnisse prüfen.
                </p>
                <Button onClick={() => router.push('/dashboard/unternehmen')}>
                  Zum Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {PHASES.map((phase, idx) => {
                let status: 'completed' | 'active' | 'pending'
                if (idx < currentPhase) {
                  status = 'completed'
                } else if (idx === currentPhase) {
                  status = 'active'
                } else {
                  status = 'pending'
                }

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex-shrink-0">
                      {status === 'completed' && (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      )}
                      {status === 'active' && (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      )}
                      {status === 'pending' && (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {phase}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
