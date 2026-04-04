'use client'

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

  // Redirect guard
  if (!store.sessionId || store.phase !== 'ergebnis' || !store.scoring) {
    router.push('/foerder-schnellcheck')
    return null
  }

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
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          Ihre Fördermittel-Ergebnisse
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
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
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-6 sm:p-8 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {treffer.name}
                      </h2>
                      <Badge
                        variant={
                          treffer.klasse === 'A'
                            ? 'default'
                            : treffer.klasse === 'B'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {treffer.klasse}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {treffer.foerderart} • {treffer.traeger}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {Math.round(treffer.bewilligungswahrscheinlichkeit * 100)}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Wahrscheinlichkeit</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                {/* Description */}
                <p className="text-gray-700 dark:text-gray-300">
                  {treffer.beschreibungKurz}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Max. Fördersumme
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                      {formatCurrency(treffer.maxBetrag)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Bundesweit
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                      {treffer.bundesweit ? 'Ja' : 'Regional'}
                    </p>
                  </div>
                </div>

                {/* Compatibility */}
                {treffer.dienstleisterKompatibel && (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
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
        className="bg-gradient-to-r from-primary/10 to-blue-600/10 border border-primary/20 rounded-lg p-6 sm:p-8 space-y-2"
      >
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Gesamtförderpotenzial
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-bold text-primary">
            {formatCurrency(store.scoring.gesamtMin)}
          </span>
          <span className="text-gray-600 dark:text-gray-400">bis</span>
          <span className="text-4xl sm:text-5xl font-bold text-primary">
            {formatCurrency(store.scoring.gesamtMax)}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Basierend auf Top-3-Treffer und Ihrem Unternehmensprofil
        </p>
      </motion.div>

      {/* CTA */}
      <Button
        size="lg"
        onClick={handleBericht}
        className="w-full"
      >
        Detaillierte Report anfordern
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      {/* Info */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <p className="flex items-center justify-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Erhalten Sie einen PDF-Report mit Details zu jedem Programm
        </p>
      </div>
    </div>
  )
}
