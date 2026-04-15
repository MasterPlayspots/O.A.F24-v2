'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import * as Sentry from '@sentry/nextjs'
import { usePreCheck } from '@/lib/store/preCheckStore'
import { ladeStatus } from '@/lib/api/precheck'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { CheckCircle2 } from 'lucide-react'

const PHASES = [
  { label: 'Website analysieren', value: 'analyse_laeuft' },
  { label: 'Profil erstellen', value: 'profil_ready' },
  { label: 'Fragen vorbereiten', value: 'chat' },
  { label: 'Fertig!', value: 'scoring_laeuft' },
]

export default function AnalysePage() {
  const router = useRouter()
  const store = usePreCheck()
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Redirect guard
    if (!store.sessionId || store.phase === 'url_eingabe' || store.phase === 'fehler') {
      router.push('/foerder-schnellcheck')
      return
    }

    if (store.phase === 'profil_ready') {
      router.push('/foerder-schnellcheck/profil')
      return
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await ladeStatus(store.sessionId!)
        const status = response.status as string

        // Update phase index
        const phaseIndex = PHASES.findIndex((p) => p.value === status)
        if (phaseIndex !== -1) {
          setCurrentPhaseIndex(Math.min(phaseIndex + 1, PHASES.length))
        }

        // Check for completion
        if (status === 'profil_ready') {
          router.push('/foerder-schnellcheck/profil')
        } else if (status === 'fehler') {
          setError('Analyse konnte nicht abgeschlossen werden. Bitte versuchen Sie es später erneut.')
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { area: 'foerdercheck', op: 'polling' } })
        // Continue polling even on error
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [store.sessionId, store.phase, router])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold text-white">
          Analysiere Ihr Unternehmen
        </h1>
        <p className="text-white/70">
          Dies dauert etwa 30-60 Sekunden...
        </p>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} />}

      {/* Progress Phases */}
      <div className="space-y-4 bg-architect-surface/60 rounded-lg p-8">
        {PHASES.map((phase, index) => (
          <motion.div
            key={phase.value}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 }}
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              index < currentPhaseIndex
                ? 'bg-architect-tertiary/25'
                : index === currentPhaseIndex
                ? 'bg-architect-primary/20'
                : 'bg-architect-surface-low/40'
            }`}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm">
              {index < currentPhaseIndex ? (
                <CheckCircle2 className="h-6 w-6 text-architect-tertiary-light" />
              ) : index === currentPhaseIndex ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="h-6 w-6 rounded-full border-2 border-architect-primary-light border-t-transparent"
                />
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-white/30" />
              )}
            </div>
            <span className={`font-medium ${
              index <= currentPhaseIndex
                ? 'text-white'
                : 'text-white/50'
            }`}>
              {phase.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="bg-architect-surface-low/40 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-architect-primary"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentPhaseIndex / PHASES.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Hint */}
      <p className="text-center text-sm text-white/60">
        Bitte schließen Sie diese Seite nicht. Ihre Sitzung wird automatisch fortgesetzt.
      </p>
    </div>
  )
}
