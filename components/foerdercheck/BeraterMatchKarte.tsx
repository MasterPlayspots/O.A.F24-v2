'use client'

import type { BeraterMatch } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, CheckCircle2 } from 'lucide-react'

interface BeraterMatchKarteProps {
  berater: BeraterMatch
  onAnfrage: () => void
  anfrageGesendet: boolean
}

export function BeraterMatchKarte({
  berater,
  onAnfrage,
  anfrageGesendet,
}: BeraterMatchKarteProps) {
  const getScoreBadgeColor = (score: number) => {
    if (score >= 0.8) return 'bg-chart-5/15 text-chart-5'
    if (score >= 0.6) return 'bg-chart-3/15 text-chart-3'
    if (score >= 0.4) return 'bg-primary/15 text-primary'
    return 'bg-brass/15 text-brass'
  }

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold">{berater.berater.displayName}</h3>
          <p className="text-sm text-muted-foreground">{berater.berater.region}</p>

          {/* Rating */}
          {berater.berater.ratingAvg > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(berater.berater.ratingAvg)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/60'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {berater.berater.ratingAvg.toFixed(1)} ({berater.berater.ratingCount} Bewertungen)
              </span>
            </div>
          )}
        </div>

        <Badge className={`ml-4 ${getScoreBadgeColor(berater.matchingScore)}`}>
          {Math.round(berater.matchingScore * 100)}% Match
        </Badge>
      </div>

      {/* Empfohlene Förderbereiche */}
      {berater.empfohleneFoerderbereiche && berater.empfohleneFoerderbereiche.length > 0 && (
        <div className="mb-6 space-y-2">
          <label className="text-sm font-medium">Empfohlene Förderbereiche</label>
          <div className="flex flex-wrap gap-2">
            {berater.empfohleneFoerderbereiche.map((bereich) => (
              <Badge key={bereich} variant="secondary" className="text-xs">
                {bereich}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      {berater.berater.bio && (
        <p className="mb-6 text-sm text-muted-foreground leading-relaxed">{berater.berater.bio}</p>
      )}

      {/* Specializations */}
      {berater.berater.spezialisierungen && berater.berater.spezialisierungen.length > 0 && (
        <div className="mb-6 space-y-2 border-t pt-4">
          <label className="text-sm font-medium">Spezialisierungen</label>
          <div className="flex flex-wrap gap-2">
            {berater.berater.spezialisierungen.slice(0, 3).map((spec) => (
              <Badge key={spec} variant="outline" className="text-xs">
                {spec}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Verfügbarkeit */}
      <div className="mb-6 flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            berater.berater.verfuegbar ? 'bg-chart-5' : 'bg-gray-300'
          }`}
        />
        <span className="text-sm">
          {berater.berater.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'}
        </span>
      </div>

      {/* CTA Button */}
      <Button
        onClick={onAnfrage}
        disabled={anfrageGesendet || !berater.berater.verfuegbar}
        className="w-full"
        variant={anfrageGesendet ? 'default' : 'default'}
      >
        {anfrageGesendet ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Anfrage gesendet ✓
          </>
        ) : (
          'Anfrage senden'
        )}
      </Button>
    </Card>
  )
}
