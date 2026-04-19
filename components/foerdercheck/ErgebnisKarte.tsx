'use client'

import type { CheckErgebnis } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2 } from 'lucide-react'

interface ErgebnisKarteProps {
  ergebnis: CheckErgebnis
}

export function ErgebnisKarte({ ergebnis }: ErgebnisKarteProps) {
  const getKlasseColor = (klasse: string) => {
    switch (klasse) {
      case 'A':
        return 'bg-chart-5/15 text-chart-5 hover:bg-chart-5/15'
      case 'B':
        return 'bg-chart-3/15 text-chart-3 hover:bg-chart-3/15'
      case 'C':
        return 'bg-primary/15 text-primary hover:bg-primary/15'
      case 'D':
        return 'bg-brass/15 text-brass hover:bg-brass/15'
      default:
        return 'bg-muted text-foreground'
    }
  }

  const formatCurrency = (value?: number) => {
    if (!value) return '-'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold">{ergebnis.programmName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Relevanz-Score: {(ergebnis.relevanzScore * 100).toFixed(0)}%
          </p>
        </div>
        <Badge className={`ml-4 ${getKlasseColor(ergebnis.klasse)}`}>
          Klasse {ergebnis.klasse}
        </Badge>
      </div>

      {/* Bewilligungsprognose */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Bewilligungsprognose</label>
          <span className="text-sm text-muted-foreground">
            {ergebnis.bewilligungsPrognose ? `${Math.round(ergebnis.bewilligungsPrognose * 100)}%` : '-'}
          </span>
        </div>
        {ergebnis.bewilligungsPrognose && (
          <Progress value={ergebnis.bewilligungsPrognose * 100} className="h-2" />
        )}
      </div>

      {/* Förderumme */}
      {ergebnis.maxFoerdersumme && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium">Max. Fördersumme</span>
          <span className="font-semibold">{formatCurrency(ergebnis.maxFoerdersumme)}</span>
        </div>
      )}

      {/* Begründung */}
      {ergebnis.begruendung && (
        <div className="mb-6 space-y-2">
          <label className="text-sm font-medium">Begründung</label>
          <p className="text-sm text-muted-foreground leading-relaxed">{ergebnis.begruendung}</p>
        </div>
      )}

      {/* Kombinierbare Programme */}
      {ergebnis.kombinierbarMit && ergebnis.kombinierbarMit.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <label className="text-sm font-medium">Kombinierbar mit</label>
          <div className="flex flex-wrap gap-2">
            {ergebnis.kombinierbarMit.map((prog) => (
              <Badge key={prog} variant="secondary" className="text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {prog}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
