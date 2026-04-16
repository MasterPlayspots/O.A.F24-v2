import * as Sentry from '@sentry/nextjs'
import { getFilterOptions } from '@/lib/api/fund24'
import { ProgrammListe } from '@/components/foerdercheck/ProgrammListe'

export const revalidate = 3600

export const metadata = {
  title: 'Förderprogramme',
  description: 'Durchsuchen Sie 3.400+ Förderprogramme für Ihr Unternehmen — nach Bundesland, Förderart und Bereich.',
}

export default async function ProgrammePage() {
  let filterOptions: { foerderarten: string[]; foerderbereiche: string[] } = { foerderarten: [], foerderbereiche: [] }

  try {
    filterOptions = await getFilterOptions()
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'programme', op: 'filter-options' } })
  }

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16 sm:px-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">
            Förderprogramme durchsuchen
          </h1>
          <p className="mt-4 text-lg text-white/70">
            Finden Sie die passenden Förderprogramme für Ihr Unternehmen. Nutzen Sie die Filter zur gezielten Suche.
          </p>
        </div>

        <ProgrammListe filterOptions={filterOptions} />
      </div>
    </div>
  )
}
