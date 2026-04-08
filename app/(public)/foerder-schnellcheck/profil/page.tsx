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
        <h1 className="font-display text-3xl font-bold text-white">
          Ihr Unternehmensprofil
        </h1>
        <p className="text-white/70">
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
        <Card className="bg-architect-surface/60 border-0 overflow-hidden">
          <div className="bg-architect-primary/20 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-white">
              {store.profil.firmenname}
            </h2>
            <p className="text-white/70 mt-1 text-sm">
              {store.profil.kurzprofil}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Main Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-architect-surface-low/40 rounded-lg p-4">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                  Branche
                </p>
                <p className="font-display text-lg font-semibold text-white mt-1">
                  {store.profil.branche}
                </p>
              </div>

              <div className="bg-architect-surface-low/40 rounded-lg p-4">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                  Bundesland
                </p>
                <p className="font-display text-lg font-semibold text-white mt-1">
                  {store.profil.bundesland}
                </p>
              </div>
            </div>

            {/* Technology Indicator */}
            {store.profil.technologieindikator && (
              <div className="flex items-center gap-3 bg-architect-primary/20 rounded-lg p-4">
                <Zap className="h-5 w-5 text-architect-primary-light flex-shrink-0" />
                <span className="text-sm font-medium text-architect-primary-light">
                  Tech-innovativ erkannt
                </span>
              </div>
            )}

            {/* Data Quality */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white/80">
                Datenqualität
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-architect-surface-low/40 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-architect-tertiary h-full transition-all"
                    style={{ width: `${store.profil.datenqualitaet * 10}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-white/80 w-12">
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
            className="w-full bg-architect-primary hover:bg-architect-primary-container text-white"
          >
            Umfrage starten
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {isLoading && <LadeSpinner text="Fragen werden vorbereitet..." />}

      {/* Info */}
      <div className="text-center text-xs text-white/60 flex items-center justify-center gap-2">
        <TrendingUp className="h-4 w-4" />
        <span>5-7 kurze Fragen • Ca. 3 Minuten</span>
      </div>
    </div>
  )
}
