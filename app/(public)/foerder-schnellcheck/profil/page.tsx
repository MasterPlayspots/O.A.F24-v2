'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { usePreCheck } from '@/lib/store/preCheckStore'
import { ladeFragen } from '@/lib/api/precheck'
import { Button } from '@/components/ui/button'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { Card } from '@/components/ui/card'
import { ArrowRight, TrendingUp, Zap } from 'lucide-react'

export default function ProfilPage() {
  const router = useRouter()
  const store = usePreCheck()
  const [showButton, setShowButton] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect guard
  useEffect(() => {
    if (!store.sessionId || store.phase !== 'profil_ready') {
      router.push('/foerder-schnellcheck')
    }
  }, [store.sessionId, store.phase, router])

  // Show button after 1 second
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleWeiter = async () => {
    try {
      setError(null)
      setIsLoading(true)
      const result = await ladeFragen(store.sessionId!)
      store.setFragen(result.fragen)
      router.push('/foerder-schnellcheck/chat')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Laden der Fragen'
      setError(msg)
      store.setFehler(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (!store.profil) {
    return <LadeSpinner text="Profil wird geladen..." />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Ihr Unternehmensprofil
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Das haben wir über Ihr Unternehmen gelernt
        </p>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} />}

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 p-6 sm:p-8 border-b">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {store.profil.firmenname}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
              {store.profil.kurzprofil}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Main Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Branche
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {store.profil.branche}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Bundesland
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {store.profil.bundesland}
                </p>
              </div>
            </div>

            {/* Technology Indicator */}
            {store.profil.technologieindikator && (
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Tech-innovativ erkannt
                </span>
              </div>
            )}

            {/* Data Quality */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Datenqualität
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all"
                    style={{ width: `${store.profil.datenqualitaet * 10}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12">
                  {store.profil.datenqualitaet}/10
                </span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* CTA */}
      {showButton && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            size="lg"
            onClick={handleWeiter}
            disabled={isLoading}
            className="w-full"
          >
            Umfrage starten
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {isLoading && <LadeSpinner text="Fragen werden vorbereitet..." />}

      {/* Info */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
        <TrendingUp className="h-4 w-4" />
        <span>5-7 kurze Fragen • Ca. 3 Minuten</span>
      </div>
    </div>
  )
}
