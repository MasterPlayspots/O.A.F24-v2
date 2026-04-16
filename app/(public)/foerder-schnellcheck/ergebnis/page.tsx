'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePreCheck } from '@/lib/store/preCheckStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, TrendingUp, Award } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ErgebnisPage() {
  const router = useRouter()
  const store = usePreCheck()

  // Redirect guard — must run as effect, not during render.
  const shouldRedirect =
    !store.sessionId || store.phase !== 'ergebnis' || !store.scoring
  useEffect(() => {
    if (shouldRedirect) router.push('/foerder-schnellcheck')
  }, [shouldRedirect, router])
  if (shouldRedirect) return null

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '—'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleBericht = () => {
    store.setPhase('email_formular')
    router.push('/foerder-schnellcheck/bericht')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
          Ihre Fördermittel-Ergebnisse
        </h1>
        <p className="text-white/70">
          Top 3 passende Förderprogramme für Ihr Unternehmen
        </p>
      </div>

      {/* Top 3 Programs */}
      <div className="space-y-4">
        {store.scoring.top3.map((treffer, index) => (
          <motion.div
            key={treffer.programmId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-architect-surface/60 border-0 overflow-hidden">
              <div className="bg-architect-surface-low/40 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                        {treffer.name}
                      </h2>
                      <Badge className="bg-architect-primary/20 text-architect-primary-light border-0">
                        {treffer.klasse}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/70">
                      {treffer.foerderart} • {treffer.traeger}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold text-architect-primary-light">
                      {Math.round(treffer.bewilligungswahrscheinlichkeit * 100)}%
                    </p>
                    <p className="text-xs text-white/50">Wahrscheinlichkeit</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                {/* Description */}
                <p className="text-white/80">
                  {treffer.beschreibungKurz}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 bg-architect-surface-low/40 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-semibold text-white/60 uppercase">
                      Max. Fördersumme
                    </p>
                    <p className="font-display text-lg font-bold text-white mt-1">
                      {formatCurrency(treffer.maxBetrag)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/60 uppercase">
                      Bundesweit
                    </p>
                    <p className="font-display text-lg font-bold text-white mt-1">
                      {treffer.bundesweit ? 'Ja' : 'Regional'}
                    </p>
                  </div>
                </div>

                {/* Compatibility */}
                {treffer.dienstleisterKompatibel && (
                  <div className="flex items-center gap-2 text-sm text-architect-tertiary-light bg-architect-tertiary/25 p-3 rounded-lg">
                    <Award className="h-4 w-4 flex-shrink-0" />
                    <span>Dienstleister-kompatibel</span>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Total Potential */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-architect-primary/20 rounded-lg p-6 sm:p-8 space-y-2"
      >
        <p className="text-sm font-semibold text-white/70 uppercase tracking-wide">
          Gesamtförderpotenzial
        </p>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl sm:text-5xl font-bold text-architect-primary-light">
            {formatCurrency(store.scoring.gesamtMin)}
          </span>
          <span className="text-white/60">bis</span>
          <span className="font-display text-4xl sm:text-5xl font-bold text-architect-primary-light">
            {formatCurrency(store.scoring.gesamtMax)}
          </span>
        </div>
        <p className="text-sm text-white/70 mt-2">
          Basierend auf Top-3-Treffer und Ihrem Unternehmensprofil
        </p>
      </motion.div>

      {/* CTA */}
      <Button
        size="lg"
        onClick={handleBericht}
        className="w-full bg-architect-primary hover:bg-architect-primary-container text-white"
      >
        Detaillierte Report anfordern
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      {/* Info */}
      <div className="text-center text-sm text-white/60 space-y-2">
        <p className="flex items-center justify-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Erhalten Sie einen PDF-Report mit Details zu jedem Programm
        </p>
      </div>
    </div>
  )
}
