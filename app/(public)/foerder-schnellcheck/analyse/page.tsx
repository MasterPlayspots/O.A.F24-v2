'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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
  const [isPolling, setIsPolling] = useState(true)

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
        const status = response.status as any

        // Update phase index
        const phaseIndex = PHASES.findIndex((p) => p.value === status)
        if (phaseIndex !== -1) {
          setCurrentPhaseIndex(Math.min(phaseIndex + 1, PHASES.length))
        }

        // Check for completion
        if (status === 'profil_ready') {
          setIsPolling(false)
          router.push('/foerder-schnellcheck/profil')
        } else if (status === 'fehler') {
          setIsPolling(false)
          setError('Analyse konnte nicht abgeschlossen werden. Bitte versuchen Sie es später erneut.')
        }
      } catch (err) {
        console.error('Polling error:', err)
        // Continue polling even on error
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [store.sessionId, store.phase, router])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Analysiere Ihr Unternehmen
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Dies dauert etwa 30-60 Sekunden...
        </p>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} />}

      {/* Progress Phases */}
      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        {PHASES.map((phase, index) => (
          <motion.div
            key={phase.value}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 }}
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              index < currentPhaseIndex
                ? 'bg-green-50 dark:bg-green-900/20'
                : index === currentPhaseIndex
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : 'bg-gray-50 dark:bg-gray-900/50'
            }`}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm">
              {index < currentPhaseIndex ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : index === currentPhaseIndex ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="h-6 w-6 rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent"
                />
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
            </div>
            <span className={`font-medium ${
              index <= currentPhaseIndex
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {phase.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-blue-600"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentPhaseIndex / PHASES.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Hint */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Bitte schließen Sie diese Seite nicht. Ihre Sitzung wird automatisch fortgesetzt.
      </p>
    </div>
  )
}
