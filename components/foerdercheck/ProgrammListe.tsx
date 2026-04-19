'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProgramme } from '@/lib/api/fund24'
import { ProgrammKarte } from './ProgrammKarte'
import { Button } from '@/components/ui/button'
import { FilterOptions } from '@/lib/types'
import { Loader2 } from 'lucide-react'

interface ProgrammListeProps {
  filterOptions?: FilterOptions
  initialFilter?: {
    foerderarten?: string[]
    foerderbereiche?: string[]
  }
}

function ProgrammSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-white p-6 dark:border-border/40 dark:bg-foreground">
      <div className="space-y-3">
        <div className="h-4 w-1/3 rounded bg-muted dark:bg-card" />
        <div className="h-6 w-2/3 rounded bg-muted dark:bg-card" />
        <div className="h-4 w-full rounded bg-muted dark:bg-card" />
        <div className="h-4 w-5/6 rounded bg-muted dark:bg-card" />
      </div>
    </div>
  )
}

export function ProgrammListe({
  filterOptions,
  initialFilter: _initialFilter,
}: ProgrammListeProps) {
  const [offset, setOffset] = useState(0)
  const [bundesland, setBundesland] = useState('')
  const [foerderart, setFoerderart] = useState('')
  const [foerderbereich, setFoerderbereich] = useState('')
  const [suche, setSuche] = useState('')

  const limit = 20

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['programme', { bundesland, foerderart, foerderbereich, suche, offset, limit }],
    queryFn: () =>
      getProgramme({
        bundesland: bundesland || undefined,
        foerderart: foerderart || undefined,
        foerderbereich: foerderbereich || undefined,
        suche: suche || undefined,
        limit,
        offset,
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const bundeslaender = useMemo(
    () => [
      'Baden-Württemberg',
      'Bayern',
      'Berlin',
      'Brandenburg',
      'Bremen',
      'Hamburg',
      'Hessen',
      'Mecklenburg-Vorpommern',
      'Niedersachsen',
      'Nordrhein-Westfalen',
      'Rheinland-Pfalz',
      'Saarland',
      'Sachsen',
      'Sachsen-Anhalt',
      'Schleswig-Holstein',
      'Thüringen',
    ],
    []
  )

  const handleReset = () => {
    setBundesland('')
    setFoerderart('')
    setFoerderbereich('')
    setSuche('')
    setOffset(0)
  }

  const programmes = data?.results || []
  const total = data?.total || 0
  const hasMore = offset + limit < total

  return (
    <div className="space-y-8">
      {/* Filter Section */}
      <div className="space-y-4 rounded-lg border border-border bg-white p-6 dark:border-border/40 dark:bg-foreground">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Bundesland Select */}
          <div className="flex flex-col gap-2">
            <label htmlFor="bundesland" className="text-sm font-medium text-foreground/80 dark:text-muted-foreground/60">
              Bundesland
            </label>
            <select
              id="bundesland"
              value={bundesland}
              onChange={(e) => {
                setBundesland(e.target.value)
                setOffset(0)
              }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition-colors duration-200 hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border/60 dark:bg-foreground dark:text-white dark:hover:border-border/80"
            >
              <option value="">Alle Bundesländer</option>
              {bundeslaender.map((bl) => (
                <option key={bl} value={bl}>
                  {bl}
                </option>
              ))}
            </select>
          </div>

          {/* Foerderart Select */}
          <div className="flex flex-col gap-2">
            <label htmlFor="foerderart" className="text-sm font-medium text-foreground/80 dark:text-muted-foreground/60">
              Förderart
            </label>
            <select
              id="foerderart"
              value={foerderart}
              onChange={(e) => {
                setFoerderart(e.target.value)
                setOffset(0)
              }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition-colors duration-200 hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border/60 dark:bg-foreground dark:text-white dark:hover:border-border/80"
            >
              <option value="">Alle Förderarten</option>
              {filterOptions?.foerderarten?.map((fa) => (
                <option key={fa} value={fa}>
                  {fa}
                </option>
              ))}
            </select>
          </div>

          {/* Foerderbereich Select */}
          <div className="flex flex-col gap-2">
            <label htmlFor="foerderbereich" className="text-sm font-medium text-foreground/80 dark:text-muted-foreground/60">
              Förderbereich
            </label>
            <select
              id="foerderbereich"
              value={foerderbereich}
              onChange={(e) => {
                setFoerderbereich(e.target.value)
                setOffset(0)
              }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition-colors duration-200 hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border/60 dark:bg-foreground dark:text-white dark:hover:border-border/80"
            >
              <option value="">Alle Förderbereiche</option>
              {filterOptions?.foerderbereiche?.map((fb) => (
                <option key={fb} value={fb}>
                  {fb}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="search" className="text-sm font-medium text-foreground/80 dark:text-muted-foreground/60">
              Suche
            </label>
            <input
              id="search"
              type="text"
              placeholder="Programmname…"
              value={suche}
              onChange={(e) => {
                setSuche(e.target.value)
                setOffset(0)
              }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border/60 dark:bg-foreground dark:text-white dark:placeholder:text-muted-foreground/70 dark:hover:border-border/80"
            />
          </div>
        </div>

        {/* Reset Button */}
        {(bundesland || foerderart || foerderbereich || suche) && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            Filter zurücksetzen
          </Button>
        )}
      </div>

      {/* Results Info */}
      <div className="text-sm text-muted-foreground dark:text-muted-foreground/70">
        {isLoading ? (
          'Lädt Programme…'
        ) : total === 0 ? (
          'Keine Filter angewendet'
        ) : (
          <>
            {offset + 1}–{Math.min(offset + limit, total)} von <strong>{total.toLocaleString('de-DE')}</strong> Programmen
          </>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-destructive/10 p-4 text-sm text-destructive dark:border-red-900 dark:bg-red-900/20 dark:text-destructive/70">
          Fehler beim Laden der Programme. Bitte versuchen Sie es später erneut.
        </div>
      )}

      {/* Programme Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProgrammSkeleton key={i} />
          ))}
        </div>
      ) : programmes.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-background py-12 text-center dark:border-border/40 dark:bg-foreground">
          <div>
            <p className="text-lg font-medium text-foreground dark:text-white">Keine Programme gefunden.</p>
            <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground/70">
              Versuchen Sie, Ihre Suchkriterien zu ändern.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programmes.map((programm) => (
            <ProgrammKarte key={programm.id} programm={programm} />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setOffset((prev) => prev + limit)}
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Lädt…
              </>
            ) : (
              'Mehr laden'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
