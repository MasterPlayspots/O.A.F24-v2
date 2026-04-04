import { getFilterOptions } from '@/lib/api/fund24'
import { ProgrammListe } from '@/components/foerdercheck/ProgrammListe'

export const revalidate = 3600

export const metadata = {
  title: 'Förderprogramme | fund24',
  description: 'Durchsuchen Sie 2.500+ Förderprogramme für Ihr Unternehmen — nach Bundesland, Förderart und Bereich.',
}

export default async function ProgrammePage() {
  let filterOptions: { foerderarten: string[]; foerderbereiche: string[] } = { foerderarten: [], foerderbereiche: [] }

  try {
    filterOptions = await getFilterOptions()
  } catch (error) {
    console.error('Fehler beim Abrufen der Filteroptionen:', error)
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16 sm:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Förderprogramme durchsuchen
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Finden Sie die passenden Förderprogramme für Ihr Unternehmen. Nutzen Sie die Filter zur gezielten Suche.
        </p>
      </div>

      <ProgrammListe filterOptions={filterOptions} />
    </div>
  )
}
